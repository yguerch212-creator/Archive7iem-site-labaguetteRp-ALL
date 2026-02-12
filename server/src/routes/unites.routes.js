const express = require('express')
const { param } = require('express-validator')
const { handleValidation } = require('../middleware/validate')
const { authenticateToken } = require('../middleware/auth')
const { query, queryOne } = require('../config/db')

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// GET /api/unites - Liste des unités
router.get('/', async (req, res) => {
  try {
    const unites = await query(`
      SELECT u.*, 
             COUNT(e.id) as effectifs_count
      FROM unites u
      LEFT JOIN effectifs e ON u.id = e.unite_id AND e.statut = 'Actif'
      WHERE u.active = 1
      GROUP BY u.id
      ORDER BY u.nom
    `)

    res.json({
      success: true,
      data: {
        unites
      }
    })
  } catch (error) {
    console.error('Error fetching unites:', error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des unités'
    })
  }
})

// GET /api/unites/:id/grades - Grades d'une unité
router.get('/:id/grades', [
  param('id').isInt().withMessage('ID unité invalide')
], handleValidation, async (req, res) => {
  try {
    // Check if unit exists
    const unite = await queryOne(
      'SELECT id, nom FROM unites WHERE id = ? AND active = 1',
      [req.params.id]
    )

    if (!unite) {
      return res.status(404).json({
        success: false,
        message: 'Unité non trouvée'
      })
    }

    // Get grades for this unit
    const grades = await query(`
      SELECT g.id, g.nom, g.niveau, g.couleur,
             COUNT(e.id) as effectifs_count
      FROM grades g
      LEFT JOIN effectifs e ON g.id = e.grade_id 
                           AND e.unite_id = ? 
                           AND e.statut = 'Actif'
      WHERE g.unite_id = ? OR g.unite_id IS NULL
      GROUP BY g.id
      ORDER BY g.niveau DESC, g.nom
    `, [req.params.id, req.params.id])

    res.json({
      success: true,
      data: {
        unite,
        grades
      }
    })
  } catch (error) {
    console.error('Error fetching grades:', error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des grades'
    })
  }
})

module.exports = router