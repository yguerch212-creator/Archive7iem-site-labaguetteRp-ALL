const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// GET /api/galerie?unite_id=X
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { unite_id, all } = req.query
    let sql = `SELECT g.*, u.nom AS unite_nom, u.code AS unite_code, CONCAT(us.prenom,' ',us.nom) AS auteur_nom
               FROM galerie g LEFT JOIN unites u ON u.id = g.unite_id LEFT JOIN users us ON us.id = g.created_by`
    const params = []
    const conditions = []
    if (!all && !(req.user?.isAdmin || req.user?.isOfficier)) conditions.push('g.approuve = 1')
    if (unite_id) { conditions.push('g.unite_id = ?'); params.push(unite_id) }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ')
    sql += ' ORDER BY g.created_at DESC'
    const rows = await query(sql, params)
    res.json({ success: true, data: rows })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/galerie
router.post('/', auth, async (req, res) => {
  try {
    const { titre, description, image_data, unite_id } = req.body
    if (!image_data) return res.status(400).json({ success: false, message: 'Image requise' })
    const autoApprove = req.user.isAdmin || req.user.isOfficier ? 1 : 0
    const [result] = await pool.execute(
      'INSERT INTO galerie (unite_id, titre, description, image_data, approuve, created_by) VALUES (?,?,?,?,?,?)',
      [unite_id || null, titre || null, description || null, image_data, autoApprove, req.user.id]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/galerie/:id/approve
router.put('/:id/approve', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) return res.status(403).json({ success: false, message: 'Non autorisé' })
    await pool.execute('UPDATE galerie SET approuve = 1 WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/galerie/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await queryOne('SELECT * FROM galerie WHERE id = ?', [req.params.id])
    if (!item) return res.status(404).json({ success: false, message: 'Introuvable' })
    if (!req.user.isAdmin && !req.user.isOfficier && item.created_by !== req.user.id) return res.status(403).json({ error: 'Non autorisé' })
    await pool.execute('DELETE FROM galerie WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
