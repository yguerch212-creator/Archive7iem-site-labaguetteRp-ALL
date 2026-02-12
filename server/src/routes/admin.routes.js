const express = require('express')
const { body, param, query } = require('express-validator')
const { handleValidation } = require('../middleware/validate')
const { authenticateToken } = require('../middleware/auth')
const { requireAdmin } = require('../middleware/admin')

const router = express.Router()

// All routes require authentication and admin privileges
router.use(authenticateToken)
router.use(requireAdmin)

// GET /api/admin/users - Liste des utilisateurs
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide')
], handleValidation, async (req, res) => {
  try {
    // TODO: Implement getUsersAdmin controller
    res.json({
      success: true,
      data: {
        users: [
          {
            id: 1,
            username: 'admin',
            email: 'admin@archives7e.com',
            unite_nom: null,
            groups: ['Administration'],
            active: true,
            date_creation: '2024-01-01T00:00:00.000Z',
            derniere_connexion: '2024-02-12T18:00:00.000Z'
          },
          {
            id: 2,
            username: 'schmidt.h',
            email: 'schmidt@archives7e.com',
            unite_nom: '916 Grenadier Regiment',
            groups: ['Utilisateur'],
            active: true,
            date_creation: '2024-01-15T00:00:00.000Z',
            derniere_connexion: '2024-02-12T17:30:00.000Z'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs'
    })
  }
})

// POST /api/admin/users - Créer un utilisateur
router.post('/users', [
  body('username').trim().notEmpty().withMessage('Nom d\'utilisateur requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe trop court (min 6 caractères)'),
  body('unite_id').optional().isInt().withMessage('Unité invalide'),
  body('groups').optional().isArray().withMessage('Groupes invalides')
], handleValidation, async (req, res) => {
  try {
    // TODO: Implement createUserAdmin controller
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        user: {
          id: 3,
          username: req.body.username,
          email: req.body.email,
          active: true
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'utilisateur'
    })
  }
})

// PUT /api/admin/users/:id - Modifier un utilisateur
router.put('/users/:id', [
  param('id').isInt().withMessage('ID utilisateur invalide'),
  body('username').optional().trim().notEmpty().withMessage('Nom d\'utilisateur invalide'),
  body('email').optional().isEmail().withMessage('Email invalide'),
  body('unite_id').optional().isInt().withMessage('Unité invalide'),
  body('active').optional().isBoolean().withMessage('Statut actif invalide'),
  body('groups').optional().isArray().withMessage('Groupes invalides')
], handleValidation, async (req, res) => {
  try {
    // TODO: Implement updateUserAdmin controller
    res.json({
      success: true,
      message: 'Utilisateur modifié avec succès'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de l\'utilisateur'
    })
  }
})

// DELETE /api/admin/users/:id - Supprimer un utilisateur
router.delete('/users/:id', [
  param('id').isInt().withMessage('ID utilisateur invalide')
], handleValidation, async (req, res) => {
  try {
    // TODO: Implement deleteUserAdmin controller
    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'utilisateur'
    })
  }
})

// GET /api/admin/stats - Statistiques générales
router.get('/stats', async (req, res) => {
  try {
    // TODO: Implement getStatsAdmin controller
    res.json({
      success: true,
      data: {
        stats: {
          total_users: 25,
          active_users: 23,
          total_effectifs: 342,
          active_effectifs: 298,
          total_rapports: 156,
          rapports_ce_mois: 18,
          incidents_ouverts: 3,
          unites_actives: 7
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    })
  }
})

module.exports = router