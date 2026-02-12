const express = require('express')
const { body, param, query } = require('express-validator')
const { handleValidation } = require('../middleware/validate')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// GET /api/rapports - Liste des rapports
router.get('/', [
  query('type').optional().isIn(['rapport', 'incident', 'recommandation', 'mission']).withMessage('Type de rapport invalide'),
  query('unite_id').optional().isInt().withMessage('ID unité invalide'),
  query('statut').optional().isIn(['Brouillon', 'Envoyé', 'Lu', 'Archivé']).withMessage('Statut invalide'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide')
], handleValidation, async (req, res) => {
  try {
    // TODO: Implement getRapports controller
    res.json({
      success: true,
      data: {
        rapports: [
          {
            id: 1,
            titre: 'Mission de reconnaissance - Secteur Nord',
            type: 'rapport',
            statut: 'Envoyé',
            auteur: 'Hauptmann Schmidt',
            date_creation: '2024-02-12T10:30:00.000Z',
            unite_nom: '916 Grenadier Regiment'
          },
          {
            id: 2,
            titre: 'Incident disciplinaire - Soldat Müller',
            type: 'incident',
            statut: 'Lu',
            auteur: 'Feldwebel Weber',
            date_creation: '2024-02-11T14:15:00.000Z',
            unite_nom: '254 Feldgendarmerie'
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
      message: 'Erreur lors de la récupération des rapports'
    })
  }
})

// GET /api/rapports/:id - Détails d'un rapport
router.get('/:id', [
  param('id').isInt().withMessage('ID rapport invalide')
], handleValidation, async (req, res) => {
  try {
    // TODO: Implement getRapport controller
    res.json({
      success: true,
      data: {
        rapport: {
          id: parseInt(req.params.id),
          titre: 'Mission de reconnaissance - Secteur Nord',
          type: 'rapport',
          contenu: 'Contenu détaillé du rapport...',
          statut: 'Envoyé',
          auteur_id: 1,
          auteur: 'Hauptmann Schmidt',
          unite_id: 1,
          unite_nom: '916 Grenadier Regiment',
          date_creation: '2024-02-12T10:30:00.000Z',
          date_modification: '2024-02-12T10:30:00.000Z'
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du rapport'
    })
  }
})

// POST /api/rapports - Créer un rapport
router.post('/', [
  body('titre').trim().notEmpty().withMessage('Titre requis'),
  body('type').isIn(['rapport', 'incident', 'recommandation', 'mission']).withMessage('Type de rapport invalide'),
  body('contenu').trim().notEmpty().withMessage('Contenu requis'),
  body('statut').optional().isIn(['Brouillon', 'Envoyé']).withMessage('Statut invalide')
], handleValidation, async (req, res) => {
  try {
    // TODO: Implement createRapport controller
    res.status(201).json({
      success: true,
      message: 'Rapport créé avec succès',
      data: {
        rapport: {
          id: 3,
          ...req.body,
          auteur_id: req.user.id,
          unite_id: req.user.unite_id,
          date_creation: new Date().toISOString(),
          date_modification: new Date().toISOString()
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du rapport'
    })
  }
})

// PUT /api/rapports/:id - Modifier un rapport
router.put('/:id', [
  param('id').isInt().withMessage('ID rapport invalide'),
  body('titre').optional().trim().notEmpty().withMessage('Titre invalide'),
  body('contenu').optional().trim().notEmpty().withMessage('Contenu invalide'),
  body('statut').optional().isIn(['Brouillon', 'Envoyé', 'Archivé']).withMessage('Statut invalide')
], handleValidation, async (req, res) => {
  try {
    // TODO: Implement updateRapport controller
    res.json({
      success: true,
      message: 'Rapport modifié avec succès'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du rapport'
    })
  }
})

// DELETE /api/rapports/:id - Supprimer un rapport
router.delete('/:id', [
  param('id').isInt().withMessage('ID rapport invalide')
], handleValidation, async (req, res) => {
  try {
    // TODO: Implement deleteRapport controller
    res.json({
      success: true,
      message: 'Rapport supprimé avec succès'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du rapport'
    })
  }
})

module.exports = router