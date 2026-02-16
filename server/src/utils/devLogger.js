const fs = require('fs')
const path = require('path')

// Log directory — relative to project root
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', '..', 'logs')

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })

// Date helper
function dateStr() { return new Date().toISOString().slice(0, 10) }
function timestamp() { return new Date().toISOString() }

// Log levels
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }
const LOG_LEVEL = LEVELS[process.env.LOG_LEVEL || 'info'] ?? 2

function writeLog(level, category, message, meta = null) {
  if (LEVELS[level] > LOG_LEVEL) return

  const line = JSON.stringify({
    t: timestamp(),
    level,
    cat: category,
    msg: message,
    ...(meta ? { meta } : {})
  }) + '\n'

  // Write to daily log file
  const logFile = path.join(LOG_DIR, `${dateStr()}.log`)
  fs.appendFile(logFile, line, () => {})

  // Errors also go to error-only log
  if (level === 'error') {
    const errFile = path.join(LOG_DIR, `${dateStr()}-errors.log`)
    fs.appendFile(errFile, line, () => {})
  }

  // Also console for pm2
  const prefix = `[${timestamp()}] [${level.toUpperCase()}] [${category}]`
  if (level === 'error') console.error(prefix, message, meta || '')
  else if (level === 'warn') console.warn(prefix, message)
  else if (LOG_LEVEL >= 2) console.log(prefix, message)
}

// Crash/uncaught logging
function logCrash(type, err) {
  const crashFile = path.join(LOG_DIR, `crash-${dateStr()}.log`)
  const entry = [
    `\n${'='.repeat(60)}`,
    `CRASH: ${type}`,
    `Time: ${timestamp()}`,
    `Message: ${err?.message || err}`,
    `Stack: ${err?.stack || 'N/A'}`,
    `PID: ${process.pid}`,
    `Memory: ${JSON.stringify(process.memoryUsage())}`,
    `Uptime: ${process.uptime().toFixed(0)}s`,
    `${'='.repeat(60)}\n`
  ].join('\n')

  fs.appendFileSync(crashFile, entry)
  console.error(`[CRASH] ${type}:`, err?.message || err)
}

// Request logging (for access logs)
function logRequest(req, res, durationMs) {
  const meta = {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    ms: durationMs,
    ip: req.ip || req.connection?.remoteAddress,
    user: req.user?.username || 'anon',
    ua: (req.headers['user-agent'] || '').slice(0, 80)
  }

  if (res.statusCode >= 500) {
    writeLog('error', 'http', `${req.method} ${req.originalUrl} → ${res.statusCode} (${durationMs}ms)`, meta)
  } else if (res.statusCode >= 400) {
    writeLog('warn', 'http', `${req.method} ${req.originalUrl} → ${res.statusCode} (${durationMs}ms)`, meta)
  } else {
    writeLog('debug', 'http', `${req.method} ${req.originalUrl} → ${res.statusCode} (${durationMs}ms)`, meta)
  }
}

// DB error logging
function logDbError(operation, err, sql = null) {
  writeLog('error', 'db', `${operation}: ${err.message}`, {
    code: err.code,
    errno: err.errno,
    sql: sql?.slice(0, 200)
  })
}

// Auth logging
function logAuth(action, username, success, ip, details = null) {
  writeLog(success ? 'info' : 'warn', 'auth', `${action}: ${username} → ${success ? 'OK' : 'FAIL'}`, {
    ip, ...(details ? { details } : {})
  })
}

// Cleanup: delete logs older than 30 days
function cleanOldLogs() {
  try {
    const files = fs.readdirSync(LOG_DIR)
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    for (const f of files) {
      const fp = path.join(LOG_DIR, f)
      const stat = fs.statSync(fp)
      if (stat.mtimeMs < cutoff) fs.unlinkSync(fp)
    }
  } catch (e) { /* ignore */ }
}

// Run cleanup daily
setInterval(cleanOldLogs, 24 * 60 * 60 * 1000)

module.exports = {
  log: (cat, msg, meta) => writeLog('info', cat, msg, meta),
  warn: (cat, msg, meta) => writeLog('warn', cat, msg, meta),
  error: (cat, msg, meta) => writeLog('error', cat, msg, meta),
  debug: (cat, msg, meta) => writeLog('debug', cat, msg, meta),
  logCrash,
  logRequest,
  logDbError,
  logAuth,
  LOG_DIR
}
