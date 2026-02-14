const { logActivity } = require('../utils/logger')

/**
 * Auto-log middleware: logs all POST/PUT/DELETE requests after successful response.
 * Placed after auth middleware to have req.user available.
 */
function autoLog(req, res, next) {
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return next()

  const originalJson = res.json.bind(res)
  res.json = function(data) {
    // Only log successful writes
    if (data && data.success !== false && res.statusCode < 400) {
      const path = req.originalUrl || req.url
      // Extract target type from route
      const match = path.match(/^\/api\/(\w+)/)
      const targetType = match ? match[1] : 'unknown'
      // Extract target ID from params or response
      const targetId = req.params?.id || req.params?.effectifId || data?.data?.id || data?.insertId || null
      const action = `${req.method.toLowerCase()}_${targetType}`
      
      logActivity(req, action, targetType, targetId).catch(() => {})
    }
    return originalJson(data)
  }
  next()
}

module.exports = { autoLog }
