const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// GET /api/bibliotheque — List all items (optionally filtered by type/unite)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { type, unite_id } = req.query
    let sql = `
      SELECT b.*, u.nom AS unite_nom, u.code AS unite_code,
             CONCAT(us.prenom, ' ', us.nom) AS created_by_nom
      FROM bibliotheque b
      LEFT JOIN unites u ON u.id = b.unite_id
      LEFT JOIN users us ON us.id = b.created_by
      WHERE 1=1
    `
    const params = []
    if (type) { sql += ' AND b.type = ?'; params.push(type) }
    if (unite_id) { sql += ' AND b.unite_id = ?'; params.push(unite_id) }
    sql += ' ORDER BY b.type, b.nom'
    const rows = await query(sql, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/bibliotheque — Add item (officier/admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) {
      return res.status(403).json({ success: false, message: 'Réservé aux officiers' })
    }
    const { type, nom, description, unite_id, image_data } = req.body
    if (!nom || !image_data) {
      return res.status(400).json({ success: false, message: 'Nom et image requis' })
    }
    const [result] = await pool.execute(
      'INSERT INTO bibliotheque (type, nom, description, unite_id, image_data, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [type || 'tampon', nom, description || null, unite_id || null, image_data, req.user.id]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/bibliotheque/:id — Delete item (owner or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await queryOne('SELECT * FROM bibliotheque WHERE id = ?', [req.params.id])
    if (!item) return res.status(404).json({ success: false, message: 'Introuvable' })
    if (!req.user.isAdmin && item.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    }
    await pool.execute('DELETE FROM bibliotheque WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
