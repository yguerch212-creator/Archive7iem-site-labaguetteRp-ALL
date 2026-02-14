const jwt = require('jsonwebtoken')
const config = require('../config/env')
const { queryOne } = require('../config/db')

// Full auth — requires valid token
async function auth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token manquant' })
    }

    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, config.jwt.secret)

    const user = await queryOne(`
      SELECT u.id, u.nom, u.prenom, u.username, u.role_level, u.unite_id, u.effectif_id, u.must_change_password,
             un.nom AS unite_nom, un.code AS unite_code, g.nom_complet AS grade_nom, g.rang AS grade_rang,
             (SELECT COUNT(*) FROM user_groups ug JOIN \`groups\` gp ON gp.id = ug.group_id 
              WHERE ug.user_id = u.id AND gp.name = 'Administration') > 0 AS isAdmin,
             (SELECT COUNT(*) FROM user_groups ug JOIN \`groups\` gp ON gp.id = ug.group_id 
              WHERE ug.user_id = u.id AND gp.name = 'Recenseur') > 0 AS isRecenseur,
             (SELECT COUNT(*) FROM user_groups ug JOIN \`groups\` gp ON gp.id = ug.group_id 
              WHERE ug.user_id = u.id AND gp.name = 'Officier') > 0 AS isOfficier,
             (SELECT COUNT(*) FROM user_groups ug JOIN \`groups\` gp ON gp.id = ug.group_id 
              WHERE ug.user_id = u.id AND gp.name = 'Feldgendarmerie') > 0 AS isFeldgendarmerie,
             (SELECT COUNT(*) FROM user_groups ug JOIN \`groups\` gp ON gp.id = ug.group_id 
              WHERE ug.user_id = u.id AND gp.name = 'Sanitaets') > 0 AS isSanitaets,
             (SELECT COUNT(*) FROM user_groups ug JOIN \`groups\` gp ON gp.id = ug.group_id 
              WHERE ug.user_id = u.id AND gp.name = 'Etat-Major') > 0 AS isEtatMajor
      FROM users u
      LEFT JOIN unites un ON u.unite_id = un.id
      LEFT JOIN grades g ON g.id = u.grade_id
      WHERE u.id = ? AND u.active = 1
    `, [decoded.userId])

    if (!user) {
      return res.status(401).json({ success: false, message: 'Utilisateur invalide' })
    }

    user.isAdmin = !!user.isAdmin
    user.isRecenseur = !!user.isRecenseur
    user.isOfficier = !!user.isOfficier
    user.isFeldgendarmerie = !!user.isFeldgendarmerie
    user.isSanitaets = !!user.isSanitaets
    user.isEtatMajor = !!user.isEtatMajor
    user.isGuest = false
    user.mustChangePassword = !!user.must_change_password
    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' })
  }
}

// Optional auth — sets req.user if token present, otherwise guest
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    req.user = { id: 0, isGuest: true, isAdmin: false, isRecenseur: false, isOfficier: false, isFeldgendarmerie: false, isSanitaets: false, isEtatMajor: false }
    return next()
  }
  return auth(req, res, next)
}

module.exports = auth
module.exports.auth = auth
module.exports.optionalAuth = optionalAuth
