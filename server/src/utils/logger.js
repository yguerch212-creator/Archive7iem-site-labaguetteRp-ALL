const { pool } = require('../config/db')

/**
 * Log an activity for audit trail
 */
async function logActivity(req, action, targetType = null, targetId = null, details = null) {
  try {
    await pool.execute(
      'INSERT INTO activity_logs (user_id, username, action, target_type, target_id, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        req.user?.id || null,
        req.user?.username || 'anonymous',
        action,
        targetType,
        targetId,
        details ? String(details).slice(0, 500) : null,
        req.ip || req.connection?.remoteAddress || null
      ]
    )
  } catch (err) {
    console.error('Activity log error:', err.message)
  }
}

module.exports = { logActivity }
