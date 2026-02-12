const express = require('express')
const { body, param, query } = require('express-validator')
const { handleValidation } = require('../middleware/validate')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// GET /api/effectifs - Liste des effectifs
router.get('/', [
  query('unite_id').optional().isInt().withMessage('ID unité invalide'),
  query('active').optional().isBoolean().withMessage('Statut actif invalide'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide')
], handleValidation, async (req, res) => {
  try {
    // TODO: Implement getEffectifs controller
    res.json({
      success: true,
      data: {
        effectifs: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des effectifs'
    })
  }
})

// GET /api/effectifs/:id - Détails d'un effectif
router.get('/:id', [
  param('id').isInt().withMessage('ID effectif invalide')
], handleValidation, async (req, res) => {
  try {
    // TODO: Implement getEffectif controller
    res.json({
      success: true,
      data: {
        effectif: null
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'effectif'
    })
  }
})

// POST /api/effectifs - Créer un effectif
router.post('/', [
  body('nom').trim().notEmpty().withMessage('Nom requis'),
  body('prenom').trim().notEmpty().withMessage('Prénom requis'),
  body('unite_id').isInt().withMessage('Unité requise'),
  body('grade_id').optional().isInt().withMessage('Grade invalide'),
  body('date_naissance').optional().isISO8601().withMessage('Date de naissance invalide'),
  body('lieu_naissance').optional().trim(),
  body('nationalite').optional().trim(),
  body('statut').optional().isIn(['Actif', 'Inactif', 'MIA', 'KIA']).withMessage('Statut invalide')
], handleValidation, async (req, res) => {
  try {
    // TODO: Implement createEffectif controller
    res.status(201).json({
      success: true,
      message: 'Effectif créé avec succès',
      data: {
        effectif: {
          id: 1,
          ...req.body
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'effectif'
    })
  }
})

// PUT /api/effectifs/:id - Modifier un effectif
router.put('/:id', [
  param('id').isInt().withMessage('ID effectif invalide'),
  body('nom').optional().trim().notEmpty().withMessage('Nom invalide'),
  body('prenom').optional().trim().notEmpty().withMessage('Prénom invalide'),
  body('unite_id').optional().isInt().withMessage('Unité invalide'),
  body('grade_id').optional().isInt().withMessage('Grade invalide'),
  body('statut').optional().isIn(['Actif', 'Inactif', 'MIA', 'KIA']).withMessage('Statut invalide')
], handleValidation, async (req, res) => {
  try {
    // TODO: Implement updateEffectif controller
    res.json({
      success: true,
      message: 'Effectif modifié avec succès'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de l\'effectif'
    })
  }
})

// DELETE /api/effectifs/:id - Supprimer un effectif
router.delete('/:id', [
  param('id').isInt().withMessage('ID effectif invalide')
], handleValidation, async (req, res) => {
  try {
    // TODO: Implement deleteEffectif controller
    res.json({
      success: true,
      message: 'Effectif supprimé avec succès'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'effectif'
    })
  }
})

module.exports = router