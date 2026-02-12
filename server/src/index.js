const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
require('./config/env')

const { queryOne } = require('./config/db')

// Routes
const authRoutes = require('./routes/auth.routes')
const effectifsRoutes = require('./routes/effectifs.routes')
const unitesRoutes = require('./routes/unites.routes')
const rapportsRoutes = require('./routes/rapports.routes')
const soldbuchRoutes = require('./routes/soldbuch.routes')
const searchRoutes = require('./routes/search.routes')
const adminRoutes = require('./routes/admin.routes')

const app = express()
const PORT = process.env.PORT || 3001

// Rate limiting (login stricter)
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 })
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 })

// Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors({ origin: true, credentials: true }))
app.use(generalLimiter)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Static uploads
app.use('/uploads', express.static('uploads'))

// Routes
app.use('/api/auth', loginLimiter, authRoutes)
app.use('/api/effectifs', effectifsRoutes)
app.use('/api/unites', unitesRoutes)
app.use('/api/rapports', rapportsRoutes)
app.use('/api/soldbuch', soldbuchRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/admin', adminRoutes)

// Stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const { query } = require('./config/db')
    const effectifs = await queryOne('SELECT COUNT(*) as c FROM effectifs')
    const rapports = await queryOne('SELECT COUNT(*) as c FROM rapports')
    const unites = await queryOne('SELECT COUNT(*) as c FROM unites')
    
    // Effectifs par unité
    const parUnite = await query(`
      SELECT u.id, u.code, u.nom, u.couleur, COUNT(e.id) as count
      FROM unites u
      LEFT JOIN effectifs e ON e.unite_id = u.id
      GROUP BY u.id ORDER BY count DESC
    `)
    
    // 5 derniers rapports
    const derniers = await query(`
      SELECT id, titre, type, auteur_nom, date_irl, created_at
      FROM rapports ORDER BY created_at DESC LIMIT 5
    `)
    
    res.json({ effectifs: effectifs.c, rapports: rapports.c, unites: unites.c, parUnite, derniers })
  } catch (err) {
    console.error('Stats error:', err)
    res.json({ effectifs: 0, rapports: 0, unites: 0, parUnite: [], derniers: [] })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Archives Wehrmacht RP API', timestamp: new Date().toISOString() })
})

// 404 - catch unmatched API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Route non trouvée' })
  }
  next()
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur'
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Archives Wehrmacht RP API — http://localhost:${PORT}`)
  console.log(`📋 Health: http://localhost:${PORT}/api/health`)
})

module.exports = app
