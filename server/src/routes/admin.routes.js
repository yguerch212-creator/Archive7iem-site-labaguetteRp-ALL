const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const admin = require('../middleware/admin')

// GET /api/admin/users
router.get('/users', auth, admin, async (req, res) => {
  try {
    const users = await query(`
      SELECT u.id, u.nom, u.prenom, u.username, u.role_level, u.must_change_password, u.active,
             g.nom_complet AS grade_nom, un.nom AS unite_nom,
             (SELECT COUNT(*) FROM user_groups ug JOIN \`groups\` gp ON gp.id = ug.group_id 
              WHERE ug.user_id = u.id AND gp.name = 'Administration') > 0 AS is_admin
      FROM users u
      LEFT JOIN grades g ON g.id = u.grade_id
      LEFT JOIN unites un ON un.id = u.unite_id
      ORDER BY u.role_level DESC, u.nom
    `)
    res.json({ success: true, data: users })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/admin/effectifs-sans-compte
router.get('/effectifs-sans-compte', auth, admin, async (req, res) => {
  try {
    const rows = await query(`
      SELECT e.id, e.nom, e.prenom, g.nom_complet AS grade_nom, u.nom AS unite_nom
      FROM effectifs e
      LEFT JOIN grades g ON e.grade_id = g.id
      LEFT JOIN unites u ON e.unite_id = u.id
      WHERE NOT EXISTS (
        SELECT 1 FROM users us WHERE us.nom = e.nom AND us.prenom = e.prenom AND us.unite_id = e.unite_id
      )
      ORDER BY e.nom
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/admin/users (create from effectif)
router.post('/users', auth, admin, async (req, res) => {
  try {
    const { effectif_id, password } = req.body
    const eff = await queryOne(`
      SELECT e.*, u.nom AS unite_nom FROM effectifs e LEFT JOIN unites u ON e.unite_id = u.id WHERE e.id = ?
    `, [effectif_id])
    if (!eff) return res.status(404).json({ success: false, message: 'Effectif introuvable' })

    const exists = await queryOne('SELECT id FROM users WHERE nom = ? AND prenom = ? AND unite_id = ?', [eff.nom, eff.prenom, eff.unite_id])
    if (exists) return res.status(400).json({ success: false, message: 'Compte déjà existant' })

    const hash = await bcrypt.hash(password || 'Wehrmacht123', 10)
    const username = `${eff.prenom.toLowerCase()}.${eff.nom.toLowerCase()}`.replace(/\s/g, '')
    
    await pool.execute(
      'INSERT INTO users (nom, prenom, username, password_hash, unite_id, grade_id, role_level, must_change_password, active) VALUES (?, ?, ?, ?, ?, ?, 1, 1, 1)',
      [eff.nom, eff.prenom, username, hash, eff.unite_id, eff.grade_id]
    )
    res.json({ success: true, message: `Compte créé pour ${eff.prenom} ${eff.nom} (${username}) — mdp: ${password || 'Wehrmacht123'}` })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/admin/users/:id/group
router.put('/users/:id/group', auth, admin, async (req, res) => {
  try {
    const { action } = req.body // 'add' or 'remove'
    const adminGroup = await queryOne("SELECT id FROM `groups` WHERE name = 'Administration'")
    if (!adminGroup) return res.status(500).json({ success: false, message: 'Groupe Administration introuvable' })

    if (action === 'add') {
      await pool.execute('INSERT IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)', [req.params.id, adminGroup.id])
    } else {
      await pool.execute('DELETE FROM user_groups WHERE user_id = ? AND group_id = ?', [req.params.id, adminGroup.id])
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
