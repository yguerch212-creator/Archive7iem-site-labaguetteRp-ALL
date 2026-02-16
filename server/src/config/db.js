const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'archives_user',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'archives7e',
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 100,
  enableKeepAlive: true,
  keepAliveInitialDelay: 5000,
  connectTimeout: 30000,
  idleTimeout: 60000,
  maxIdle: 20,
})

// Retry wrapper — retries once on connection lost
async function query(sql, params = []) {
  // Use pool.query for template literals (LIMIT etc), pool.execute for prepared statements
  const method = params.length > 0 ? 'execute' : 'query'
  try {
    const [rows] = await pool[method](sql, params)
    return rows
  } catch (err) {
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || 
        err.code === 'ECONNRESET' || 
        err.code === 'ECONNREFUSED' ||
        (err.message && err.message.includes('Connection lost'))) {
      console.warn('[DB] Connection lost, retrying...')
      const [rows] = await pool[method](sql, params)
      return rows
    }
    throw err
  }
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params)
  return rows[0] || null
}

module.exports = { pool, query, queryOne }
