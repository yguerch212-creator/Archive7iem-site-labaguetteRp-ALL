const router = require('express').Router()
const auth = require('../middleware/auth')
const { login, logout, getMe, changePassword } = require('../controllers/auth.controller')
const { query, queryOne, pool } = require('../config/db')
const devLog = require('../utils/devLogger')

router.post('/login', login)
router.post('/logout', auth, logout)
router.get('/me', auth, getMe)
router.put('/change-password', auth, changePassword)

// POST /api/auth/forgot-password — Public, sends notification to admins
router.post('/forgot-password', async (req, res) => {
  try {
    const { username, discord_id, message } = req.body
    if (!username || !discord_id) {
      return res.status(400).json({ success: false, message: 'Nom d\'utilisateur et Discord ID requis' })
    }

    // Check user exists
    const user = await queryOne('SELECT id, username FROM users WHERE username = ?', [username])
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ success: true, message: 'Demande envoyée' })
    }

    // Insert notification for all admins
    const admins = await query(`
      SELECT u.id FROM users u
      JOIN user_groups ug ON ug.user_id = u.id
      JOIN \`groups\` g ON g.id = ug.group_id
      WHERE g.name = 'Administration' AND u.active = 1
    `)

    const content = `🔑 Demande de réinitialisation de mot de passe\n\nUtilisateur: ${username}\nDiscord: ${discord_id}${message ? `\nMessage: ${message}` : ''}`

    for (const admin of admins) {
      await pool.execute(
        'INSERT INTO notifications (user_id, type, titre, message, lien) VALUES (?, ?, ?, ?, ?)',
        [admin.id, 'password_reset', '🔑 Demande MDP', content, '/admin/users']
      )
    }

    devLog.log('auth', `Password reset request: ${username} (discord: ${discord_id})`)

    res.json({ success: true, message: 'Demande envoyée' })
  } catch (err) {
    devLog.error('auth', `Forgot password error: ${err.message}`)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

module.exports = router
