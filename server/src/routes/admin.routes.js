const { logActivity } = require('../utils/logger')
const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const admin = require('../middleware/admin')
const privileged = require('../middleware/privileged')

// GET /api/admin/groups — List all groups
router.get('/groups', auth, privileged, async (req, res) => {
  try {
    const rows = await query('SELECT id, name FROM `groups` ORDER BY name')
    res.json({ success: true, data: rows })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// GET /api/admin/users
router.get('/users', auth, privileged, async (req, res) => {
  try {
    const users = await query(`
      SELECT u.id, u.nom, u.prenom, u.username, u.role_level, u.must_change_password, u.active,
             g.nom_complet AS grade_nom, un.nom AS unite_nom,
             (SELECT GROUP_CONCAT(r.name SEPARATOR ', ') FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id) AS role_names,
             (SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
              WHERE ur.user_id = u.id AND r.name = 'Administration') > 0 AS is_admin,
             (SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
              WHERE ur.user_id = u.id AND r.name = 'Administratif') > 0 AS is_recenseur,
             (SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
              WHERE ur.user_id = u.id AND r.name = 'Officier') > 0 AS is_officier,
             (SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
              WHERE ur.user_id = u.id AND r.name = 'Sous-officier') > 0 AS is_sousofficier,
             (SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
              WHERE ur.user_id = u.id AND r.name = 'Feldgendarmerie') > 0 AS is_feldgendarmerie,
             (SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
              WHERE ur.user_id = u.id AND r.name = 'Sanitat') > 0 AS is_sanitaets,
             (SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
              WHERE ur.user_id = u.id AND r.name = 'Etat-Major') > 0 AS is_etatmajor
      FROM users u
      LEFT JOIN grades g ON g.id = u.grade_id
      LEFT JOIN unites un ON un.id = u.unite_id
      ORDER BY u.role_level DESC, u.nom
    `)
    res.json({ success: true, data: users })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// GET /api/admin/effectifs-sans-compte
router.get('/effectifs-sans-compte', auth, privileged, async (req, res) => {
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
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// POST /api/admin/users (create from effectif)
router.post('/users', auth, privileged, async (req, res) => {
  try {
    const { effectif_id, password } = req.body
    const eff = await queryOne(`
      SELECT e.*, u.nom AS unite_nom FROM effectifs e LEFT JOIN unites u ON e.unite_id = u.id WHERE e.id = ?
    `, [effectif_id])
    if (!eff) return res.status(404).json({ success: false, message: 'Effectif introuvable' })

    const exists = await queryOne('SELECT id FROM users WHERE nom = ? AND prenom = ? AND unite_id = ?', [eff.nom, eff.prenom, eff.unite_id])
    if (exists) return res.status(400).json({ success: false, message: 'Compte déjà existant' })

    if (!password || password.length < 8) return res.status(400).json({ success: false, message: 'Mot de passe requis (min 8 caractères)' })
    const hash = await bcrypt.hash(password, 10)
    const username = `${eff.prenom.toLowerCase()}.${eff.nom.toLowerCase()}`.replace(/\s/g, '')
    
    const [insertResult] = await pool.execute(
      'INSERT INTO users (nom, prenom, username, password_hash, unite_id, grade_id, effectif_id, role_level, must_change_password, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1)',
      [eff.nom, eff.prenom, username, hash, eff.unite_id, eff.grade_id, eff.id]
    )
    const newUserId = insertResult.insertId

    // Auto-assign groups based on unite and grade
    const unite = await queryOne('SELECT code FROM unites WHERE id = ?', [eff.unite_id])
    const grade = await queryOne('SELECT rang, categorie FROM grades WHERE id = ?', [eff.grade_id])
    const autoGroups = []

    // Sanitats group for 916S members who are sous-officier+ (rang >= 30)
    if (unite?.code === 'FSA' && grade?.rang >= 30) {
      autoGroups.push('Sanitat')
    }
    // Sous-officier group for rang >= 30 and < 60
    if (grade?.rang >= 30 && grade?.rang < 60) {
      autoGroups.push('Sous-officier')
    }
    // Officier group for rang >= 60
    if (grade?.rang >= 60) {
      autoGroups.push('Officier')
    }

    for (const gName of autoGroups) {
      const grp = await queryOne('SELECT id FROM `groups` WHERE name = ?', [gName])
      if (grp) {
        await pool.execute('INSERT IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)', [newUserId, grp.id])
      }
    }

    res.json({ success: true, message: `Compte créé pour ${eff.prenom} ${eff.nom} (${username})` })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// PUT /api/admin/users/:id/group
router.put('/users/:id/group', auth, privileged, async (req, res) => {
  try {
    const { action, group } = req.body // action: 'add'|'remove', group: 'Administration'|'Administratif'|etc.
    console.log('GROUP TOGGLE:', req.params.id, action, group)
    const groupName = group || 'Administration'
    // Non-admins cannot modify admin-level groups
    const restrictedGroups = ['Administration', 'Etat-Major']
    if (restrictedGroups.includes(groupName) && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Seul un administrateur peut modifier ce groupe' })
    }
    const grp = await queryOne("SELECT id FROM `groups` WHERE name = ?", [groupName])
    if (!grp) return res.status(500).json({ success: false, message: `Groupe ${groupName} introuvable` })

    if (action === 'add') {
      await pool.execute('INSERT IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)', [req.params.id, grp.id])
    } else {
      await pool.execute('DELETE FROM user_groups WHERE user_id = ? AND group_id = ?', [req.params.id, grp.id])
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Group toggle error:', err.message, err.code, err.sqlMessage); res.status(500).json({ success: false, message: err.sqlMessage || err.message || "Erreur serveur" })
  }
})

// GET /api/admin/users/:id/groups — Get all groups for a user
router.get('/users/:id/groups', auth, privileged, async (req, res) => {
  try {
    const rows = await query(`
      SELECT g.id, g.name FROM \`groups\` g
      JOIN user_groups ug ON ug.group_id = g.id
      WHERE ug.user_id = ?
    `, [req.params.id])
    res.json({ success: true, data: rows.map(r => r.name) })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
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
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// PUT /api/admin/users/:id/toggle-active
router.put('/users/:id/toggle-active', auth, admin, async (req, res) => {
  try {
    await pool.execute('UPDATE users SET active = NOT active WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// (duplicate /groups route removed — defined at top of file)

// GET /api/admin/logs — Activity logs
router.get('/logs', auth, privileged, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200)
    const rows = await query(
      `SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ${limit}`
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// PUT /api/admin/users/:id/reset-password
router.put('/users/:id/reset-password', auth, privileged, async (req, res) => {
  try {
    const { new_password } = req.body
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mot de passe requis (min 6 caractères)' })
    }

    const bcrypt = require('bcryptjs')
    const hash = await bcrypt.hash(new_password, 10)
    await pool.execute('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?', [hash, req.params.id])

    const target = await queryOne('SELECT username FROM users WHERE id = ?', [req.params.id])
    const { logActivity } = require('../utils/logger')
    logActivity(req, 'password_reset', 'user', req.params.id, `MDP réinitialisé pour ${target?.username}`)

    res.json({ success: true, message: `Mot de passe réinitialisé. L'utilisateur devra le changer à la prochaine connexion.` })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// GET /api/admin/password-requests
router.get('/password-requests', auth, privileged, async (req, res) => {
  try {
    const rows = await query(`
      SELECT n.id, n.message AS content, n.created_at, n.lu AS read_at
      FROM notifications n
      WHERE n.type = 'password_reset' AND n.user_id = ?
      ORDER BY n.created_at DESC LIMIT 20
    `, [req.user.id])
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// PUT /api/admin/notifications/:id/read
router.put('/notifications/:id/read', auth, privileged, async (req, res) => {
  try {
    await pool.execute('UPDATE notifications SET lu = 1 WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

module.exports = router
