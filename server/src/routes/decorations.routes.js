const { logActivity } = require('../utils/logger')
const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')
const recenseur = require('../middleware/recenseur')

// GET /api/decorations — List all available decorations
router.get('/', optionalAuth, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM decorations ORDER BY categorie, rang DESC')
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/decorations/effectif/:id — Decorations for an effectif
router.get('/effectif/:id', auth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT ed.*, d.nom AS decoration_nom, d.nom_allemand, d.categorie, d.rang, d.image_url
      FROM effectif_decorations ed
      LEFT JOIN decorations d ON d.id = ed.decoration_id
      WHERE ed.effectif_id = ?
      ORDER BY COALESCE(d.rang, 0) DESC, ed.created_at ASC
    `, [req.params.id])
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/decorations/effectif/:id — Award decoration (recenseur+ or self)
router.post('/effectif/:id', auth, async (req, res) => {
  const targetId = parseInt(req.params.id)
  const isSelf = req.user.effectif_id === targetId
  const isPrivileged = req.user.isAdmin || req.user.isRecenseur
  if (!isSelf && !isPrivileged) return res.status(403).json({ success: false, message: 'Non autorisé' })
  try {
    const { decoration_id, nom_custom, date_attribution, attribue_par, motif } = req.body
    if (!decoration_id && !nom_custom) return res.status(400).json({ success: false, message: 'Sélectionnez une décoration ou saisissez un nom' })
    
    const [result] = await pool.execute(
      'INSERT INTO effectif_decorations (effectif_id, decoration_id, nom_custom, date_attribution, attribue_par, motif) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, decoration_id || null, nom_custom || null, date_attribution || null, attribue_par || null, motif || null]
    )
    logActivity(req, 'award_decoration', 'effectif', parseInt(req.params.id), nom_custom || `decoration #${decoration_id}`)
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/decorations/effectif-decoration/:id (recenseur+)
router.delete('/effectif-decoration/:id', auth, recenseur, async (req, res) => {
  try {
    await pool.execute('DELETE FROM effectif_decorations WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
