const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'archives_user',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'archives7e',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
})

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params)
  return rows[0] || null
}

module.exports = { pool, query, queryOne }
