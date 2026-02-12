require('dotenv').config()

module.exports = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: '24h'
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    name: process.env.DB_NAME || 'archives7e',
    user: process.env.DB_USER || 'archives_user',
    pass: process.env.DB_PASS || ''
  }
}
