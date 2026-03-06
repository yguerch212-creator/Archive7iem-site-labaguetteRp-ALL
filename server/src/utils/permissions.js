const { query, queryOne } = require('../config/db')

// All available salons
const SALONS = [
  'effectifs', 'rapports', 'documentation', 'journal', 'telegrammes',
  'medical', 'sanctions', 'front', 'pds', 'commandement', 'bibliotheque',
  'organigramme', 'admin', 'dossiers', 'habillement', 'solde', 'interdits', 'archives'
]

// All available permissions
const PERMISSIONS = [
  'view', 'create', 'edit', 'edit_others', 'delete', 'delete_others',
  'validate', 'sign', 'export'
]

const GLOBAL_PERMISSIONS = [
  'manage_roles', 'manage_regiment_effectifs', 'manage_all_effectifs',
  'view_logs', 'manage_users', 'moderate', 'manage_notifications',
  'bypass_validation', 'administrator'
]

/**
 * Resolve all permissions for a user (global + per-salon overrides)
 */
async function resolvePermissions(userId) {
  // Get all roles for user
  const roles = await query(`
    SELECT r.id, r.name, r.level, r.permissions_global, r.is_system
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = ?
    ORDER BY r.level ASC
  `, [userId])

  const global = {}
  const salons = {}

  // Merge global permissions (union of all roles)
  for (const role of roles) {
    let perms = {}
    try { perms = typeof role.permissions_global === 'string' ? JSON.parse(role.permissions_global) : (role.permissions_global || {}) } catch {}
    for (const [k, v] of Object.entries(perms)) {
      if (v === true) global[k] = true
    }
  }

  // Get salon overrides
  if (roles.length > 0) {
    const roleIds = roles.map(r => r.id)
    const salonPerms = await query(`
      SELECT role_id, salon, permissions FROM role_salon_permissions
      WHERE role_id IN (${roleIds.map(() => '?').join(',')})
    `, roleIds)

    for (const sp of salonPerms) {
      let perms = {}
      try { perms = typeof sp.permissions === 'string' ? JSON.parse(sp.permissions) : (sp.permissions || {}) } catch {}
      if (!salons[sp.salon]) salons[sp.salon] = {}
      for (const [k, v] of Object.entries(perms)) {
        // DENY always wins
        if (v === 'deny') {
          salons[sp.salon][k] = 'deny'
        } else if (v === 'allow' && salons[sp.salon][k] !== 'deny') {
          salons[sp.salon][k] = 'allow'
        }
        // 'inherit' = skip
      }
    }
  }

  const highestLevel = roles.length > 0 ? Math.min(...roles.map(r => r.level)) : 99

  return { global, salons, highestLevel, roles: roles.map(r => ({ id: r.id, name: r.name, level: r.level })) }
}

/**
 * Check if user has a specific permission in a salon
 */
function hasPermission(resolved, salon, action) {
  if (resolved.global.administrator) return true
  const salonPerms = resolved.salons[salon]
  if (salonPerms) {
    if (salonPerms[action] === 'deny') return false
    if (salonPerms[action] === 'allow') return true
  }
  return !!resolved.global[action]
}

/**
 * Middleware factory: check permission for a salon+action
 */
function checkPermission(salon, action) {
  return async (req, res, next) => {
    try {
      const perms = await resolvePermissions(req.user.id)
      req.userPermissions = perms
      if (hasPermission(perms, salon, action)) return next()
      return res.status(403).json({ success: false, message: 'Permission insuffisante' })
    } catch (err) {
      console.error('Permission check error:', err)
      return res.status(500).json({ success: false, message: 'Erreur serveur' })
    }
  }
}

/**
 * Check if assigner can grant a permission (must have it themselves)
 */
function canAssignPermission(assignerPerms, permission) {
  if (assignerPerms.global.administrator) return true
  if (assignerPerms.global[permission]) return true
  return Object.values(assignerPerms.salons).some(s => s[permission] === 'allow')
}

module.exports = {
  SALONS, PERMISSIONS, GLOBAL_PERMISSIONS,
  resolvePermissions, hasPermission, checkPermission, canAssignPermission
}
