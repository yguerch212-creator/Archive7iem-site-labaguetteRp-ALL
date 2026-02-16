const router = require('express').Router()
const { query } = require('../config/db')

// GET /api/grades - Tous les grades
router.get('/', async (req, res) => {
  try {
    const grades = await query('SELECT id, nom_complet, rang, categorie, unite_id FROM grades ORDER BY rang DESC')
    res.json({ success: true, data: grades })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/grades/:id - Grade spécifique
router.get('/:id', async (req, res) => {
  try {
    const grade = await query('SELECT * FROM grades WHERE id = ?', [req.params.id])
    if (grade.length === 0) {
      return res.status(404).json({ success: false, message: 'Grade non trouvé' })
    }
    res.json({ success: true, data: grade[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router