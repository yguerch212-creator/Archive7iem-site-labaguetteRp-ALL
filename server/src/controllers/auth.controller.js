const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query, queryOne } = require('../config/db')
const config = require('../config/env')

async function login(req, res) {
  try {
    const { username, password } = req.body

    // Get user with groups
    const user = await queryOne(`
      SELECT u.id, u.username, u.email, u.password, u.unite_id, u.active,
             un.nom as unite_nom,
             GROUP_CONCAT(g.nom) as groups
      FROM users u
      LEFT JOIN unites un ON u.unite_id = un.id
      LEFT JOIN user_groups ug ON u.id = ug.user_id
      LEFT JOIN groups g ON ug.group_id = g.id
      WHERE (u.username = ? OR u.email = ?)
      GROUP BY u.id
    `, [username, username])

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Nom d\'utilisateur ou mot de passe incorrect'
      })
    }

    if (!user.active) {
      return res.status(401).json({
        success: false,
        message: 'Compte désactivé'
      })
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password)
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Nom d\'utilisateur ou mot de passe incorrect'
      })
    }

    // Check if user is admin
    const groups = user.groups ? user.groups.split(',') : []
    const isAdmin = groups.includes('Administration')

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    )

    // Update last login
    await query(
      'UPDATE users SET derniere_connexion = NOW() WHERE id = ?',
      [user.id]
    )

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        unite_id: user.unite_id,
        unite: user.unite_nom,
        groups,
        isAdmin
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion'
    })
  }
}

async function logout(req, res) {
  try {
    // In a JWT system, logout is mainly client-side
    // But we can log the action or invalidate tokens in a blacklist
    
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion'
    })
  }
}

async function getMe(req, res) {
  try {
    // User info is already available from auth middleware
    res.json({
      success: true,
      user: req.user
    })
  } catch (error) {
    console.error('GetMe error:', error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    })
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user.id

    // Get current password hash
    const user = await queryOne(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    )

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      })
    }

    // Verify current password
    const currentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!currentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      })
    }

    // Hash new password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    // Update password
    await query(
      'UPDATE users SET password = ?, date_modification = NOW() WHERE id = ?',
      [hashedPassword, userId]
    )

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du mot de passe'
    })
  }
}

module.exports = {
  login,
  logout,
  getMe,
  changePassword
}