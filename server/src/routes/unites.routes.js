const router = require('express').Router()
const { query } = require('../config/db')

// GET /api/unites
router.get('/', async (req, res) => {
  try {
    const unites = await query('SELECT id, code, nom, couleur FROM unites ORDER BY id')
    res.json({ success: true, data: unites })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/unites/:id/grades
router.get('/:id/grades', async (req, res) => {
  try {
    const grades = await query(
      'SELECT id, nom_complet, rang FROM grades WHERE unite_id = ? ORDER BY rang DESC',
      [req.params.id]
    )
    res.json({ success: true, data: grades })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
