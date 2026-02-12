const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
require('./config/env')

// Routes
const authRoutes = require('./routes/auth.routes')
const effectifsRoutes = require('./routes/effectifs.routes')
const unitesRoutes = require('./routes/unites.routes')
const rapportsRoutes = require('./routes/rapports.routes')
const adminRoutes = require('./routes/admin.routes')

const app = express()
const PORT = process.env.PORT || 3001

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})

// Middlewares
app.use(helmet())
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ['http://localhost:5173'] : true,
  credentials: true
}))
app.use(limiter)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Serve uploaded files
app.use('/uploads', express.static('uploads'))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/effectifs', effectifsRoutes)
app.use('/api/unites', unitesRoutes)
app.use('/api/rapports', rapportsRoutes)
app.use('/api/admin', adminRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Archives Wehrmacht RP API',
    timestamp: new Date().toISOString()
  })
})

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route non trouvée' 
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack)
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})

module.exports = app