const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query, queryOne } = require('../config/db')
const config = require('../config/env')

async function login(req, res) {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Nom et mot de passe requis' })
    }

    const user = await queryOne(`
      SELECT u.id, u.nom, u.prenom, u.username, u.password_hash, u.unite_id, u.active, u.must_change_password,
             un.nom AS unite_nom, g.nom_complet AS grade_nom
      FROM users u
      LEFT JOIN unites un ON u.unite_id = un.id
      LEFT JOIN grades g ON g.id = u.grade_id
      WHERE u.username = ? OR u.nom = ?
    `, [username, username])

    if (!user) {
      return res.status(401).json({ success: false, message: 'Nom ou mot de passe incorrect' })
    }
    if (!user.active) {
      return res.status(401).json({ success: false, message: 'Compte désactivé' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Nom ou mot de passe incorrect' })
    }

    // Check groups
    const adminCheck = await queryOne(`
      SELECT COUNT(*) as c FROM user_groups ug
      JOIN \`groups\` g ON g.id = ug.group_id
      WHERE ug.user_id = ? AND g.name = 'Administration'
    `, [user.id])
    const isAdmin = adminCheck.c > 0

    const recenseurCheck = await queryOne(`
      SELECT COUNT(*) as c FROM user_groups ug
      JOIN \`groups\` g ON g.id = ug.group_id
      WHERE ug.user_id = ? AND g.name = 'Recenseur'
    `, [user.id])
    const isRecenseur = recenseurCheck.c > 0

    const token = jwt.sign({ userId: user.id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn })

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        username: user.username,
        unite: user.unite_nom,
        grade: user.grade_nom,
        unite_id: user.unite_id,
        isAdmin,
        isRecenseur,
        mustChangePassword: !!user.must_change_password
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
}

async function getMe(req, res) {
  res.json({ success: true, user: req.user })
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id])
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' })

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect' })

    const hash = await bcrypt.hash(newPassword, 10)
    await require('../config/db').pool.execute(
      'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
      [hash, req.user.id]
    )
    res.json({ success: true, message: 'Mot de passe modifié' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
}

async function logout(req, res) {
  res.json({ success: true })
}

module.exports = { login, getMe, changePassword, logout }
