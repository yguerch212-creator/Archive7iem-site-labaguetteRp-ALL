const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

function convertDateFR(dateStr) {
  if (!dateStr) return null
  const m = String(dateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return dateStr
}

// Auto-number ORD-YYYY-NNN
async function nextNumero(type) {
  const prefix = type === 'ordre_de_mission' ? 'OM' : type === 'directive' ? 'DIR' : type === 'communique' ? 'COM' : 'OJ'
  const year = new Date().getFullYear()
  const row = await queryOne("SELECT numero FROM ordres WHERE numero LIKE ? ORDER BY id DESC LIMIT 1", [`${prefix}-${year}-%`])
  let seq = 1
  if (row) { const p = row.numero.split('-'); seq = parseInt(p[2]) + 1 }
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`
}

// GET /api/ordres
router.get('/', optionalAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT o.*, u.nom AS unite_nom, u.code AS unite_code,
        (SELECT COUNT(*) FROM ordres_accuses WHERE ordre_id = o.id) AS nb_accuses,
        (SELECT COUNT(*) FROM effectifs e2 WHERE e2.unite_id = o.unite_id) AS nb_effectifs_unite
      FROM ordres o LEFT JOIN unites u ON u.id = o.unite_id
      ORDER BY o.created_at DESC
    `)
    res.json({ success: true, data: rows })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/ordres/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const ordre = await queryOne('SELECT o.*, u.nom AS unite_nom, u.code AS unite_code FROM ordres o LEFT JOIN unites u ON u.id = o.unite_id WHERE o.id = ?', [req.params.id])
    if (!ordre) return res.status(404).json({ success: false, message: 'Ordre introuvable' })
    const accuses = await query(`
      SELECT oa.*, e.prenom, e.nom, g.nom_complet AS grade_nom
      FROM ordres_accuses oa JOIN effectifs e ON e.id = oa.effectif_id LEFT JOIN grades g ON g.id = e.grade_id
      WHERE oa.ordre_id = ? ORDER BY oa.lu_at DESC
    `, [req.params.id])
    // Check if current user acknowledged
    let acknowledged = false
    if (req.user.effectif_id) {
      const ack = await queryOne('SELECT id FROM ordres_accuses WHERE ordre_id = ? AND effectif_id = ?', [req.params.id, req.user.effectif_id])
      acknowledged = !!ack
    }
    res.json({ ...ordre, accuses, acknowledged })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/ordres (officier/admin)
router.post('/', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) return res.status(403).json({ success: false, message: 'Réservé aux officiers' })
    const { type, titre, contenu, unite_id, date_rp, date_irl, date_calendrier } = req.body
    const numero = await nextNumero(type || 'ordre_du_jour')
    const nom = `${req.user.prenom || ''} ${req.user.nom || req.user.username}`.trim()
    const [result] = await pool.execute(
      'INSERT INTO ordres (numero, type, titre, contenu, unite_id, emis_par, emis_par_nom, emis_par_grade, date_rp, date_irl) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [numero, type || 'ordre_du_jour', titre, contenu || null, unite_id || null, req.user.id, nom, req.user.grade || null, date_rp || null, convertDateFR(date_irl)]
    )

    // Auto-create calendrier event if date provided
    if (date_calendrier) {
      const typeMap = { ordre_de_mission: 'operation', directive: 'reunion', communique: 'autre', ordre_du_jour: 'reunion' }
      await pool.execute(
        'INSERT INTO calendrier (titre, description, date_debut, type, unite_id, created_by) VALUES (?,?,?,?,?,?)',
        [`📜 ${numero} — ${titre}`, `Ordre: ${titre}`, date_calendrier, typeMap[type] || 'autre', unite_id || null, req.user.id]
      )
    }

    res.json({ success: true, data: { id: result.insertId, numero } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/ordres/:id/accuse — Acknowledge
router.post('/:id/accuse', auth, async (req, res) => {
  try {
    if (!req.user.effectif_id) return res.status(400).json({ success: false, message: 'Effectif requis' })
    await pool.execute('INSERT IGNORE INTO ordres_accuses (ordre_id, effectif_id) VALUES (?, ?)', [req.params.id, req.user.effectif_id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/ordres/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) return res.status(403).json({ success: false, message: 'Non autorisé' })
    await pool.execute('DELETE FROM ordres WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
