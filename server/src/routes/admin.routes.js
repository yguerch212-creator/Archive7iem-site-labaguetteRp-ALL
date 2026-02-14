const { logActivity } = require('../utils/logger')
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
              WHERE ug.user_id = u.id AND gp.name = 'Administration') > 0 AS is_admin,
             (SELECT COUNT(*) FROM user_groups ug JOIN \`groups\` gp ON gp.id = ug.group_id 
              WHERE ug.user_id = u.id AND gp.name = 'Recenseur') > 0 AS is_recenseur,
             (SELECT COUNT(*) FROM user_groups ug JOIN \`groups\` gp ON gp.id = ug.group_id 
              WHERE ug.user_id = u.id AND gp.name = 'Officier') > 0 AS is_officier,
             (SELECT COUNT(*) FROM user_groups ug JOIN \`groups\` gp ON gp.id = ug.group_id 
              WHERE ug.user_id = u.id AND gp.name = 'Sous-officier') > 0 AS is_sousofficier,
             (SELECT COUNT(*) FROM user_groups ug JOIN \`groups\` gp ON gp.id = ug.group_id 
              WHERE ug.user_id = u.id AND gp.name = 'Feldgendarmerie') > 0 AS is_feldgendarmerie,
             (SELECT COUNT(*) FROM user_groups ug JOIN \`groups\` gp ON gp.id = ug.group_id 
              WHERE ug.user_id = u.id AND gp.name = 'Sanitaets') > 0 AS is_sanitaets,
             (SELECT COUNT(*) FROM user_groups ug JOIN \`groups\` gp ON gp.id = ug.group_id 
              WHERE ug.user_id = u.id AND gp.name = 'Etat-Major') > 0 AS is_etatmajor
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
      'INSERT INTO users (nom, prenom, username, password_hash, unite_id, grade_id, effectif_id, role_level, must_change_password, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1)',
      [eff.nom, eff.prenom, username, hash, eff.unite_id, eff.grade_id, eff.id]
    )
    res.json({ success: true, message: `Compte créé pour ${eff.prenom} ${eff.nom} (${username}) — mdp: ${password || 'Wehrmacht123'}` })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/admin/users/:id/group
router.put('/users/:id/group', auth, admin, async (req, res) => {
  try {
    const { action, group } = req.body // action: 'add'|'remove', group: 'Administration'|'Recenseur'
    const groupName = group || 'Administration'
    const grp = await queryOne("SELECT id FROM `groups` WHERE name = ?", [groupName])
    if (!grp) return res.status(500).json({ success: false, message: `Groupe ${groupName} introuvable` })

    if (action === 'add') {
      await pool.execute('INSERT IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)', [req.params.id, grp.id])
    } else {
      await pool.execute('DELETE FROM user_groups WHERE user_id = ? AND group_id = ?', [req.params.id, grp.id])
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/admin/users/:id/groups — Get all groups for a user
router.get('/users/:id/groups', auth, admin, async (req, res) => {
  try {
    const rows = await query(`
      SELECT g.id, g.name FROM \`groups\` g
      JOIN user_groups ug ON ug.group_id = g.id
      WHERE ug.user_id = ?
    `, [req.params.id])
    res.json({ success: true, data: rows.map(r => r.name) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/admin/users/:id — Delete user
router.delete('/users/:id', auth, admin, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ success: false, message: 'Vous ne pouvez pas vous supprimer' })
    await pool.execute('DELETE FROM user_groups WHERE user_id = ?', [req.params.id])
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/admin/users/:id/toggle-active
router.put('/users/:id/toggle-active', auth, admin, async (req, res) => {
  try {
    await pool.execute('UPDATE users SET active = NOT active WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/admin/groups — List all groups
router.get('/groups', auth, admin, async (req, res) => {
  try {
    const groups = await query('SELECT * FROM `groups` ORDER BY name')
    res.json({ success: true, data: groups })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/admin/logs — Activity logs (admin only)
router.get('/logs', auth, admin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200)
    const rows = await query(
      'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?',
      [limit]
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
