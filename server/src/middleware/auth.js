const jwt = require('jsonwebtoken')
const { queryOne } = require('../config/db')
const config = require('../config/env')

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification requis'
      })
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret)
    
    // Get user from database
    const user = await queryOne(
      `SELECT u.id, u.username, u.email, u.unite_id, un.nom as unite_nom,
              GROUP_CONCAT(g.nom) as groups
       FROM users u
       LEFT JOIN unites un ON u.unite_id = un.id
       LEFT JOIN user_groups ug ON u.id = ug.user_id
       LEFT JOIN groups g ON ug.group_id = g.id
       WHERE u.id = ? AND u.active = 1
       GROUP BY u.id`,
      [decoded.userId]
    )

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé ou désactivé'
      })
    }

    // Add user info to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      unite_id: user.unite_id,
      unite: user.unite_nom,
      groups: user.groups ? user.groups.split(',') : [],
      isAdmin: user.groups && user.groups.includes('Administration')
    }

    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      })
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré'
      })
    }

    console.error('Auth middleware error:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur d\'authentification'
    })
  }
}

module.exports = {
  authenticateToken
}