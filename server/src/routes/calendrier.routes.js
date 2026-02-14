const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// GET /api/calendrier?month=2026-02
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { month, unite_id } = req.query
    let sql = `SELECT c.*, u.nom AS unite_nom, u.code AS unite_code, us.username AS created_by_nom
               FROM calendrier c LEFT JOIN unites u ON u.id = c.unite_id LEFT JOIN users us ON us.id = c.created_by WHERE 1=1`
    const params = []
    if (month) { sql += ' AND DATE_FORMAT(c.date_debut, "%Y-%m") = ?'; params.push(month) }
    if (unite_id) { sql += ' AND c.unite_id = ?'; params.push(unite_id) }
    sql += ' ORDER BY c.date_debut ASC'
    const rows = await query(sql, params)
    res.json({ success: true, data: rows })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/calendrier (officier/admin)
router.post('/', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isRecenseur) return res.status(403).json({ success: false, message: 'Réservé aux officiers' })
    const { titre, description, date_debut, date_fin, type, unite_id } = req.body
    const [result] = await pool.execute(
      'INSERT INTO calendrier (titre, description, date_debut, date_fin, type, unite_id, created_by) VALUES (?,?,?,?,?,?,?)',
      [titre, description || null, date_debut, date_fin || null, type || 'autre', unite_id || null, req.user.id]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/calendrier/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) return res.status(403).json({ success: false, message: 'Non autorisé' })
    await pool.execute('DELETE FROM calendrier WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
