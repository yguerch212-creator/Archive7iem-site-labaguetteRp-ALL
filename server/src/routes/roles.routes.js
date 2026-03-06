const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { logActivity } = require('../utils/logger')
const { resolvePermissions, canAssignPermission, SALONS, PERMISSIONS, GLOBAL_PERMISSIONS } = require('../utils/permissions')

// GET /api/roles — List all roles
router.get('/', auth, async (req, res) => {
  try {
    const roles = await query(`
      SELECT r.*, 
        (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id) AS member_count
      FROM roles r ORDER BY r.level ASC, r.name
    `)
    // Parse JSON
    for (const r of roles) {
      try { r.permissions_global = typeof r.permissions_global === 'string' ? JSON.parse(r.permissions_global) : r.permissions_global } catch { r.permissions_global = {} }
    }
    res.json({ success: true, data: roles })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// GET /api/roles/salons — List available salons & permissions
router.get('/salons', auth, async (req, res) => {
  res.json({ success: true, data: { salons: SALONS, permissions: PERMISSIONS, globalPermissions: GLOBAL_PERMISSIONS } })
})

// GET /api/roles/:id — Role detail with salon overrides
router.get('/:id', auth, async (req, res) => {
  try {
    const role = await queryOne('SELECT * FROM roles WHERE id = ?', [req.params.id])
    if (!role) return res.status(404).json({ success: false, message: 'Rôle introuvable' })
    try { role.permissions_global = typeof role.permissions_global === 'string' ? JSON.parse(role.permissions_global) : role.permissions_global } catch { role.permissions_global = {} }
    
    const salonPerms = await query('SELECT salon, permissions FROM role_salon_permissions WHERE role_id = ?', [role.id])
    role.salon_permissions = {}
    for (const sp of salonPerms) {
      try { role.salon_permissions[sp.salon] = typeof sp.permissions === 'string' ? JSON.parse(sp.permissions) : sp.permissions } catch { role.salon_permissions[sp.salon] = {} }
    }

    const members = await query(`
      SELECT u.id, u.nom, u.prenom, u.username FROM user_roles ur
      JOIN users u ON u.id = ur.user_id WHERE ur.role_id = ?
    `, [role.id])
    role.members = members

    res.json({ success: true, data: role })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// POST /api/roles — Create a custom role
router.post('/', auth, async (req, res) => {
  try {
    const userPerms = await resolvePermissions(req.user.id)
    if (!userPerms.global.manage_roles && !userPerms.global.administrator) {
      return res.status(403).json({ success: false, message: 'Vous n\'avez pas la permission de gérer les rôles' })
    }

    const { name, color, icon, level, permissions_global, salon_permissions, regiment_id } = req.body
    if (!name || name.length < 2) return res.status(400).json({ success: false, message: 'Nom requis (min 2 caractères)' })

    // Level must be lower (higher number) than user's highest role
    const targetLevel = level || (userPerms.highestLevel + 1)
    if (targetLevel <= userPerms.highestLevel && !userPerms.global.administrator) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez pas créer un rôle de niveau supérieur ou égal au vôtre' })
    }

    // Validate that user can grant all requested permissions
    const permsGlobal = permissions_global || {}
    if (!userPerms.global.administrator) {
      for (const [perm, val] of Object.entries(permsGlobal)) {
        if (val === true && !canAssignPermission(userPerms, perm)) {
          return res.status(403).json({ success: false, message: `Vous ne possédez pas la permission "${perm}" et ne pouvez pas l'attribuer` })
        }
      }
    }

    const [result] = await pool.execute(
      'INSERT INTO roles (name, color, icon, level, is_system, created_by, regiment_id, permissions_global) VALUES (?, ?, ?, ?, FALSE, ?, ?, ?)',
      [name, color || '#8B4513', icon || null, targetLevel, req.user.id, regiment_id || null, JSON.stringify(permsGlobal)]
    )
    const roleId = result.insertId

    // Insert salon permissions
    if (salon_permissions && typeof salon_permissions === 'object') {
      for (const [salon, perms] of Object.entries(salon_permissions)) {
        if (SALONS.includes(salon) && Object.keys(perms).length > 0) {
          await pool.execute(
            'INSERT INTO role_salon_permissions (role_id, salon, permissions) VALUES (?, ?, ?)',
            [roleId, salon, JSON.stringify(perms)]
          )
        }
      }
    }

    logActivity(req, 'role_create', 'role', roleId, `Rôle "${name}" créé (niveau ${targetLevel})`)
    res.json({ success: true, data: { id: roleId }, message: `Rôle "${name}" créé` })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Un rôle avec ce nom existe déjà' })
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// PUT /api/roles/:id — Update a role
router.put('/:id', auth, async (req, res) => {
  try {
    const userPerms = await resolvePermissions(req.user.id)
    if (!userPerms.global.manage_roles && !userPerms.global.administrator) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante' })
    }

    const role = await queryOne('SELECT * FROM roles WHERE id = ?', [req.params.id])
    if (!role) return res.status(404).json({ success: false, message: 'Rôle introuvable' })

    // Can only edit roles below own level (unless admin)
    if (role.level <= userPerms.highestLevel && !userPerms.global.administrator) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez pas modifier un rôle de niveau supérieur ou égal au vôtre' })
    }

    const { name, color, icon, level, permissions_global, salon_permissions } = req.body
    const targetLevel = level || role.level
    if (targetLevel <= userPerms.highestLevel && !userPerms.global.administrator) {
      return res.status(403).json({ success: false, message: 'Niveau de rôle invalide' })
    }

    // Validate permissions
    const permsGlobal = permissions_global || {}
    if (!userPerms.global.administrator) {
      for (const [perm, val] of Object.entries(permsGlobal)) {
        if (val === true && !canAssignPermission(userPerms, perm)) {
          return res.status(403).json({ success: false, message: `Permission "${perm}" non attribuable` })
        }
      }
    }

    await pool.execute(
      'UPDATE roles SET name = ?, color = ?, icon = ?, level = ?, permissions_global = ? WHERE id = ?',
      [name || role.name, color || role.color, icon !== undefined ? icon : role.icon, targetLevel, JSON.stringify(permsGlobal), role.id]
    )

    // Replace salon permissions
    if (salon_permissions && typeof salon_permissions === 'object') {
      await pool.execute('DELETE FROM role_salon_permissions WHERE role_id = ?', [role.id])
      for (const [salon, perms] of Object.entries(salon_permissions)) {
        if (SALONS.includes(salon) && Object.keys(perms).length > 0) {
          await pool.execute(
            'INSERT INTO role_salon_permissions (role_id, salon, permissions) VALUES (?, ?, ?)',
            [role.id, salon, JSON.stringify(perms)]
          )
        }
      }
    }

    logActivity(req, 'role_update', 'role', role.id, `Rôle "${name || role.name}" modifié`)
    res.json({ success: true, message: `Rôle modifié` })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Nom de rôle déjà utilisé' })
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// DELETE /api/roles/:id — Delete a custom role
router.delete('/:id', auth, async (req, res) => {
  try {
    const userPerms = await resolvePermissions(req.user.id)
    const role = await queryOne('SELECT * FROM roles WHERE id = ?', [req.params.id])
    if (!role) return res.status(404).json({ success: false, message: 'Rôle introuvable' })
    if (role.is_system) return res.status(400).json({ success: false, message: 'Impossible de supprimer un rôle système' })
    if (role.level <= userPerms.highestLevel && !userPerms.global.administrator) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante' })
    }

    await pool.execute('DELETE FROM roles WHERE id = ?', [role.id])
    logActivity(req, 'role_delete', 'role', role.id, `Rôle "${role.name}" supprimé`)
    res.json({ success: true, message: `Rôle "${role.name}" supprimé` })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// POST /api/roles/:id/assign/:userId — Assign role to user
router.post('/:id/assign/:userId', auth, async (req, res) => {
  try {
    const userPerms = await resolvePermissions(req.user.id)
    if (!userPerms.global.manage_roles && !userPerms.global.administrator && !userPerms.global.manage_users) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante' })
    }

    const role = await queryOne('SELECT * FROM roles WHERE id = ?', [req.params.id])
    if (!role) return res.status(404).json({ success: false, message: 'Rôle introuvable' })
    if (role.level <= userPerms.highestLevel && !userPerms.global.administrator) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez pas attribuer un rôle de niveau supérieur ou égal au vôtre' })
    }

    const target = await queryOne('SELECT id, username FROM users WHERE id = ?', [req.params.userId])
    if (!target) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' })

    await pool.execute(
      'INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)',
      [target.id, role.id, req.user.id]
    )

    // Also sync to old user_groups for backward compat
    if (role.is_system) {
      const grp = await queryOne("SELECT id FROM `groups` WHERE name COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci", [role.name])
      if (grp) await pool.execute('INSERT IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)', [target.id, grp.id])
    }

    logActivity(req, 'role_assign', 'user', target.id, `Rôle "${role.name}" attribué à ${target.username}`)
    res.json({ success: true, message: `Rôle "${role.name}" attribué` })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// DELETE /api/roles/:id/assign/:userId — Remove role from user
router.delete('/:id/assign/:userId', auth, async (req, res) => {
  try {
    const userPerms = await resolvePermissions(req.user.id)
    if (!userPerms.global.manage_roles && !userPerms.global.administrator && !userPerms.global.manage_users) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante' })
    }

    const role = await queryOne('SELECT * FROM roles WHERE id = ?', [req.params.id])
    if (!role) return res.status(404).json({ success: false, message: 'Rôle introuvable' })
    if (role.level <= userPerms.highestLevel && !userPerms.global.administrator) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante' })
    }

    await pool.execute('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?', [req.params.userId, role.id])

    // Sync old system
    if (role.is_system) {
      const grp = await queryOne("SELECT id FROM `groups` WHERE name COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci", [role.name])
      if (grp) await pool.execute('DELETE FROM user_groups WHERE user_id = ? AND group_id = ?', [req.params.userId, grp.id])
    }

    logActivity(req, 'role_remove', 'user', req.params.userId, `Rôle "${role.name}" retiré`)
    res.json({ success: true, message: `Rôle retiré` })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// GET /api/roles/user/:userId/permissions — Resolved permissions for a user
router.get('/user/:userId/permissions', auth, async (req, res) => {
  try {
    const perms = await resolvePermissions(parseInt(req.params.userId))
    res.json({ success: true, data: perms })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// GET /api/roles/me/permissions — My resolved permissions
router.get('/me/permissions', auth, async (req, res) => {
  try {
    const perms = await resolvePermissions(req.user.id)
    res.json({ success: true, data: perms })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

module.exports = router
