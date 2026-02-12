const mysql = require('mysql2/promise')
const config = require('./env')

// Create connection pool
const pool = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  port: config.db.port,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  acquireTimeout: config.db.acquireTimeout,
  timeout: config.db.timeout,
  reconnect: true,
  charset: 'utf8mb4'
})

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log('✅ Database connected successfully')
    connection.release()
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    process.exit(1)
  }
}

// Initialize database connection
testConnection()

// Helper function to execute queries
async function query(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params)
    return results
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

// Helper function to get single row
async function queryOne(sql, params = []) {
  const results = await query(sql, params)
  return results[0] || null
}

// Helper function for transactions
async function transaction(callback) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

module.exports = {
  pool,
  query,
  queryOne,
  transaction
}