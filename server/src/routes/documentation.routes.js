const router = require('express').Router()
const { query, pool } = require('../config/db')
const auth = require('../middleware/auth')
const admin = require('../middleware/admin')

// GET /api/documentation — tous les liens (visibles pour tous, tous pour admin)
router.get('/', auth, async (req, res) => {
  try {
    const showAll = req.user.isAdmin && req.query.all === '1'
    const rows = await query(
      `SELECT d.*, u.username AS created_by_nom FROM documentation d JOIN users u ON u.id = d.created_by ${showAll ? '' : 'WHERE d.visible = 1'} ORDER BY d.categorie, d.ordre, d.titre`
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/documentation (admin only)
router.post('/', auth, admin, async (req, res) => {
  try {
    const { titre, description, url, categorie, ordre } = req.body
    if (!titre) return res.status(400).json({ success: false, message: 'Titre requis' })
    const [result] = await pool.execute(
      'INSERT INTO documentation (titre, description, url, categorie, ordre, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [titre, description || null, url || null, categorie || 'Autre', ordre || 0, req.user.id]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/documentation/:id (admin only)
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { titre, description, url, categorie, ordre, visible } = req.body
    await pool.execute(
      'UPDATE documentation SET titre=?, description=?, url=?, categorie=?, ordre=?, visible=? WHERE id=?',
      [titre, description || null, url || null, categorie || 'Autre', ordre || 0, visible !== false ? 1 : 0, req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/documentation/:id (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM documentation WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
