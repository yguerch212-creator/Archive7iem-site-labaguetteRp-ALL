const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// ==================== ATTESTATIONS ====================

// GET /api/attestations/:effectif_id
router.get('/:effectifId', optionalAuth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT a.*, CONCAT(s.prenom,' ',s.nom) AS signe_par_nom
       FROM soldbuch_attestations a
       LEFT JOIN effectifs s ON s.id = a.signe_par
       WHERE a.effectif_id = ? ORDER BY a.numero`,
      [req.params.effectifId]
    )
    res.json({ success: true, data: rows })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/attestations/:effectif_id — Manual attestation (officier/admin/administratif)
router.post('/:effectifId', auth, async (req, res) => {
  try {
    if (!req.user.isOfficier && !req.user.isRecenseur && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Réservé aux officiers et administratifs' })
    }
    const { modification, page, date_attestation } = req.body
    if (!modification) return res.status(400).json({ success: false, message: 'Description requise' })

    const effectifId = parseInt(req.params.effectifId)
    const nextNum = await getNextNumero(effectifId)
    const dt = date_attestation || new Date().toISOString().slice(0, 10)

    const [result] = await pool.execute(
      `INSERT INTO soldbuch_attestations (effectif_id, numero, modification, page, date_attestation, source, created_by)
       VALUES (?, ?, ?, ?, ?, 'manual', ?)`,
      [effectifId, nextNum, modification, page || null, dt, req.user.id]
    )
    res.json({ success: true, data: { id: result.insertId, numero: nextNum } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// Sign an attestation
router.put('/:attestationId/sign', auth, async (req, res) => {
  try {
    if (!req.user.isOfficier && !req.user.isRecenseur && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Seuls les officiers et administratifs peuvent signer' })
    }
    const { signature_data } = req.body
    await pool.execute(
      'UPDATE soldbuch_attestations SET signe_par = ?, signature_data = ? WHERE id = ?',
      [req.user.effectif_id || null, signature_data || null, req.params.attestationId]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// ==================== PENDING EDITS ====================

// GET /api/attestations/pending/:effectif_id
router.get('/pending/:effectifId', auth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.*, CONCAT(u.prenom,' ',u.nom) AS submitted_by_nom
       FROM soldbuch_pending_edits p
       LEFT JOIN users u ON u.id = p.submitted_by
       WHERE p.effectif_id = ? AND p.statut = 'pending'
       ORDER BY p.created_at DESC`,
      [req.params.effectifId]
    )
    res.json({ success: true, data: rows })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/attestations/pending/:effectif_id — Soldier submits a cell edit
router.post('/pending/:effectifId', auth, async (req, res) => {
  try {
    const { cell_id, old_value, new_value } = req.body
    if (!cell_id || !new_value) return res.status(400).json({ success: false, message: 'cell_id et new_value requis' })
    const [result] = await pool.execute(
      `INSERT INTO soldbuch_pending_edits (effectif_id, cell_id, old_value, new_value, submitted_by)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.effectifId, cell_id, old_value || null, new_value, req.user.id]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/attestations/pending/:pendingId/validate — Approve/reject
router.put('/pending/:pendingId/validate', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isRecenseur) {
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    }
    const { statut } = req.body // 'approved' | 'rejected'
    const pending = await queryOne('SELECT * FROM soldbuch_pending_edits WHERE id = ?', [req.params.pendingId])
    if (!pending) return res.status(404).json({ success: false, message: 'Introuvable' })

    await pool.execute(
      'UPDATE soldbuch_pending_edits SET statut = ?, validated_by = ?, validated_at = NOW() WHERE id = ?',
      [statut, req.user.id, req.params.pendingId]
    )

    if (statut === 'approved') {
      // Apply the cell edit
      const effectifId = pending.effectif_id
      const existing = await queryOne('SELECT id, layout_json FROM effectif_layouts WHERE effectif_id = ?', [effectifId])
      let layout = {}
      if (existing?.layout_json) {
        layout = typeof existing.layout_json === 'string' ? JSON.parse(existing.layout_json) : existing.layout_json
      }
      if (!layout.bookCells) layout.bookCells = {}
      layout.bookCells[pending.cell_id] = pending.new_value
      const json = JSON.stringify(layout)
      if (existing) {
        await pool.execute('UPDATE effectif_layouts SET layout_json = ? WHERE effectif_id = ?', [json, effectifId])
      } else {
        await pool.execute('INSERT INTO effectif_layouts (effectif_id, layout_json) VALUES (?, ?)', [effectifId, json])
      }

      // Auto-create attestation
      const nextNum = await getNextNumero(effectifId)
      await pool.execute(
        `INSERT INTO soldbuch_attestations (effectif_id, numero, modification, date_attestation, source, source_id, created_by)
         VALUES (?, ?, ?, CURDATE(), 'detail_validation', ?, ?)`,
        [effectifId, nextNum, `Modification: ${pending.cell_id} → ${pending.new_value}`, pending.id, req.user.id]
      )
    }

    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// ==================== AUTO-ATTESTATION HELPER ====================

async function getNextNumero(effectifId) {
  const row = await queryOne('SELECT MAX(numero) AS mx FROM soldbuch_attestations WHERE effectif_id = ?', [effectifId])
  return (row?.mx || 0) + 1
}

// Called from other routes to auto-create attestations
async function createAutoAttestation(effectifId, modification, source, sourceId, createdBy, page) {
  const nextNum = await getNextNumero(effectifId)
  await pool.execute(
    `INSERT INTO soldbuch_attestations (effectif_id, numero, modification, page, date_attestation, source, source_id, created_by)
     VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?)`,
    [effectifId, nextNum, modification, page || null, source, sourceId || null, createdBy]
  )
}

// DELETE /api/attestations/:id — Admin only
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: 'Réservé aux administrateurs' })
    await pool.execute('DELETE FROM soldbuch_attestations WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/attestations/:id/barrer — Officier/Administratif: strike through with reason
router.put('/:id/barrer', auth, async (req, res) => {
  try {
    if (!req.user.isOfficier && !req.user.isRecenseur && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Réservé aux officiers et administratifs' })
    }
    const { motif } = req.body
    if (!motif) return res.status(400).json({ success: false, message: 'Motif requis' })
    await pool.execute(
      'UPDATE soldbuch_attestations SET barre = 1, motif_barre = ?, barre_par = ? WHERE id = ?',
      [motif, req.user.effectif_id || req.user.id, req.params.id]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
module.exports.createAutoAttestation = createAutoAttestation
