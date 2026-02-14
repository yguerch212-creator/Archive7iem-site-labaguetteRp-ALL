const { logActivity } = require('../utils/logger')
const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// Auto-number: TEL-YYYY-NNN
async function nextNumero() {
  const year = new Date().getFullYear()
  const row = await queryOne(`SELECT COUNT(*) AS cnt FROM telegrammes WHERE numero LIKE ?`, [`TEL-${year}-%`])
  const seq = (row?.cnt || 0) + 1
  return `TEL-${year}-${String(seq).padStart(3, '0')}`
}

// Helper: check if user can see a confidential telegramme
function canSeeConfidential(tel, destinataires, effectifId) {
  if (!tel.prive) return true
  if (tel.expediteur_id === effectifId) return true
  if (destinataires.some(d => d.effectif_id === effectifId)) return true
  return false
}

// GET /api/telegrammes
router.get('/', optionalAuth, async (req, res) => {
  try {
    const effectifId = req.user?.effectif_id
    const tab = req.query.tab || 'tous'
    const isPrivileged = req.user?.isAdmin || req.user?.isRecenseur || req.user?.isOfficier

    let rows = await query(`
      SELECT t.*,
        exp_e.prenom AS exp_prenom, exp_e.nom AS exp_nom
      FROM telegrammes t
      LEFT JOIN effectifs exp_e ON exp_e.id = t.expediteur_id
      ORDER BY t.created_at DESC LIMIT 200
    `)

    // Load destinataires for each
    for (const t of rows) {
      t.destinataires = await query(`
        SELECT td.*, e.prenom, e.nom, g.nom_complet AS grade_nom
        FROM telegramme_destinataires td
        LEFT JOIN effectifs e ON e.id = td.effectif_id
        LEFT JOIN grades g ON g.id = e.grade_id
        WHERE td.telegramme_id = ?
      `, [t.id])
      // Build display name from destinataires
      t.destinataire_nom = t.destinataires.map(d => d.nom_libre || `${d.prenom || ''} ${d.nom || ''}`.trim()).join(', ') || t.destinataire_nom
    }

    // Filter confidential: only show if user is sender or recipient
    if (effectifId) {
      rows = rows.filter(t => canSeeConfidential(t, t.destinataires, effectifId))
    } else if (!isPrivileged) {
      rows = rows.filter(t => !t.prive)
    }

    // Tab filter
    if (tab === 'recu' && effectifId) {
      rows = rows.filter(t => t.destinataires.some(d => d.effectif_id === effectifId) && t.statut !== 'Archivé')
    } else if (tab === 'envoye' && effectifId) {
      rows = rows.filter(t => t.expediteur_id === effectifId && t.statut !== 'Archivé')
    } else if (tab === 'archive' && effectifId) {
      rows = rows.filter(t => t.statut === 'Archivé' && (t.expediteur_id === effectifId || t.destinataires.some(d => d.effectif_id === effectifId)))
    }

    // Unread count
    let unread = 0
    if (effectifId) {
      const ur = await queryOne(`
        SELECT COUNT(DISTINCT td.telegramme_id) AS cnt
        FROM telegramme_destinataires td
        JOIN telegrammes t ON t.id = td.telegramme_id
        WHERE td.effectif_id = ? AND td.lu_at IS NULL AND t.statut IN ('Envoyé','Reçu')
      `, [effectifId])
      unread = ur?.cnt || 0
    }

    res.json({ success: true, data: rows, unread })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/telegrammes/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const row = await queryOne(`SELECT t.* FROM telegrammes t WHERE t.id = ?`, [req.params.id])
    if (!row) return res.status(404).json({ success: false, message: 'Introuvable' })

    row.destinataires = await query(`
      SELECT td.*, e.prenom, e.nom, g.nom_complet AS grade_nom
      FROM telegramme_destinataires td
      LEFT JOIN effectifs e ON e.id = td.effectif_id
      LEFT JOIN grades g ON g.id = e.grade_id
      WHERE td.telegramme_id = ?
    `, [row.id])

    // Confidential check
    const effectifId = req.user?.effectif_id
    if (row.prive && !req.user?.isAdmin) {
      if (!canSeeConfidential(row, row.destinataires, effectifId)) {
        return res.status(403).json({ success: false, message: 'Télégramme confidentiel' })
      }
    }

    // Mark as read for this recipient
    if (effectifId) {
      await pool.execute('UPDATE telegramme_destinataires SET lu_at = NOW() WHERE telegramme_id = ? AND effectif_id = ? AND lu_at IS NULL', [row.id, effectifId])
    }

    res.json({ success: true, data: row })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/telegrammes — send (supports multiple destinataires)
router.post('/', auth, async (req, res) => {
  try {
    const { destinataires, objet, contenu, priorite, prive } = req.body
    // destinataires = [{effectif_id, nom_libre}, ...]
    if (!objet || !contenu) return res.status(400).json({ success: false, message: 'Objet et contenu requis' })

    const numero = await nextNumero()

    // Sender info
    let expNom = req.user.username, expGrade = null, expUnite = null, expId = null
    if (req.user.effectif_id) {
      const eff = await queryOne(`
        SELECT e.prenom, e.nom, g.nom_complet AS grade_nom, u.code AS unite_code
        FROM effectifs e LEFT JOIN grades g ON g.id = e.grade_id LEFT JOIN unites u ON u.id = e.unite_id
        WHERE e.id = ?
      `, [req.user.effectif_id])
      if (eff) { expNom = `${eff.prenom} ${eff.nom}`; expGrade = eff.grade_nom; expUnite = eff.unite_code; expId = req.user.effectif_id }
    }

    // Build destinataire_nom for legacy column
    const destList = Array.isArray(destinataires) ? destinataires : (req.body.destinataire_id ? [{ effectif_id: req.body.destinataire_id, nom_libre: req.body.destinataire_nom }] : [])
    const destNomLegacy = destList.map(d => d.nom_libre || '?').join(', ')

    const [result] = await pool.execute(`
      INSERT INTO telegrammes (numero, expediteur_id, expediteur_nom, expediteur_grade, expediteur_unite,
        destinataire_id, destinataire_nom, destinataire_unite, objet, contenu, priorite, prive, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      numero, expId, expNom, expGrade, expUnite,
      destList[0]?.effectif_id || null, destNomLegacy, req.body.destinataire_unite || null,
      objet, contenu, priorite || 'Normal', prive ? 1 : 0, req.user.id
    ])

    // Insert all destinataires
    for (const d of destList) {
      await pool.execute('INSERT INTO telegramme_destinataires (telegramme_id, effectif_id, nom_libre) VALUES (?,?,?)',
        [result.insertId, d.effectif_id || null, d.nom_libre || null])
    }

    const { notifyTelegramme } = require('../utils/discordNotify')
    notifyTelegramme({ numero, expediteur_nom: expNom, destinataire_nom: destNomLegacy, objet, priorite: priorite || 'Normal', prive }).catch(() => {})

    res.json({ success: true, data: { id: result.insertId, numero } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/telegrammes/:id/archiver
router.put('/:id/archiver', auth, async (req, res) => {
  try {
    // Only sender, recipient, or admin can archive
    const tel = await queryOne('SELECT expediteur_id FROM telegrammes WHERE id = ?', [req.params.id])
    if (!tel) return res.status(404).json({ success: false, message: 'Introuvable' })
    const effectifId = req.user.effectif_id
    const isRecipient = effectifId ? await queryOne('SELECT id FROM telegramme_destinataires WHERE telegramme_id = ? AND effectif_id = ?', [req.params.id, effectifId]) : null
    if (!req.user.isAdmin && tel.expediteur_id !== effectifId && !isRecipient) {
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    }
    await pool.execute('UPDATE telegrammes SET statut = "Archivé" WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/telegrammes/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: 'Admin requis' })
    await pool.execute('DELETE FROM telegrammes WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
