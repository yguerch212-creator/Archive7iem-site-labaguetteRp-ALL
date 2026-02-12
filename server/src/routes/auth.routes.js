const express = require('express')
const { body } = require('express-validator')
const { handleValidation } = require('../middleware/validate')
const { authenticateToken } = require('../middleware/auth')
const {
  login,
  logout,
  getMe,
  changePassword
} = require('../controllers/auth.controller')

const router = express.Router()

// POST /api/auth/login
router.post('/login', [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Nom d\'utilisateur requis'),
  body('password')
    .notEmpty()
    .withMessage('Mot de passe requis')
], handleValidation, login)

// POST /api/auth/logout
router.post('/logout', authenticateToken, logout)

// GET /api/auth/me
router.get('/me', authenticateToken, getMe)

// PUT /api/auth/change-password
router.put('/change-password', [
  authenticateToken,
  body('currentPassword')
    .notEmpty()
    .withMessage('Mot de passe actuel requis'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('La confirmation ne correspond pas au nouveau mot de passe')
      }
      return true
    })
], handleValidation, changePassword)

module.exports = router