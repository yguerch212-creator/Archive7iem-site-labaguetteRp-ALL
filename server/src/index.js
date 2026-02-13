const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
require('./config/env')

const { queryOne, query } = require('./config/db')
const auth = require('./middleware/auth')

// Routes
const authRoutes = require('./routes/auth.routes')
const effectifsRoutes = require('./routes/effectifs.routes')
const unitesRoutes = require('./routes/unites.routes')
const rapportsRoutes = require('./routes/rapports.routes')
const soldbuchRoutes = require('./routes/soldbuch.routes')
const searchRoutes = require('./routes/search.routes')
const adminRoutes = require('./routes/admin.routes')
const pdsRoutes = require('./routes/pds.routes')
const interditsRoutes = require('./routes/interdits.routes')
const medicalRoutes = require('./routes/medical.routes')
const documentationRoutes = require('./routes/documentation.routes')
const discordRoutes = require('./routes/discord.routes')
const telegrammesRoutes = require('./routes/telegrammes.routes')
const sanctionsRoutes = require('./routes/sanctions.routes')
const mediaRoutes = require('./routes/media.routes')
const affairesRoutes = require('./routes/affaires.routes')
const moderationRoutes = require('./routes/moderation.routes')
const dossiersRoutes = require('./routes/dossiers.routes')
const decorationsRoutes = require('./routes/decorations.routes')

const app = express()
app.set('trust proxy', 1) // Behind Nginx
const PORT = process.env.PORT || 3001

// Rate limiting (login stricter)
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, validate: { trustProxy: false } })
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, validate: { trustProxy: false } })

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
app.use('/api/pds', pdsRoutes)
app.use('/api/interdits', interditsRoutes)
app.use('/api/medical', medicalRoutes)
app.use('/api/documentation', documentationRoutes)
app.use('/api/discord', discordRoutes)
app.use('/api/telegrammes', telegrammesRoutes)
app.use('/api/sanctions', sanctionsRoutes)
app.use('/api/media', mediaRoutes)
app.use('/api/affaires', affairesRoutes)
app.use('/api/moderation', moderationRoutes)
app.use('/api/dossiers', dossiersRoutes)
app.use('/api/decorations', decorationsRoutes)

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

// Pending items for validation queue
app.get('/api/stats/pending', auth, async (req, res) => {
  try {
    const docs = await queryOne("SELECT COUNT(*) as c FROM moderation_queue WHERE statut = 'En attente'")
    const permissions = await queryOne("SELECT COUNT(*) as c FROM permissions_absence WHERE statut = 'En attente'")
    const interdits = await queryOne("SELECT COUNT(*) as c FROM interdits_front WHERE actif = 1")
    const media = await queryOne("SELECT COUNT(*) as c FROM media_uploads WHERE statut = 'en_attente'")
    const docsCount = docs?.c || 0
    const permsCount = permissions?.c || 0
    const interditsCount = interdits?.c || 0
    const mediaCount = media?.c || 0
    res.json({ docs: docsCount, permissions: permsCount, interdits: interditsCount, media: mediaCount, total: docsCount + permsCount + interditsCount + mediaCount })
  } catch (err) {
    res.json({ docs: 0, permissions: 0, total: 0 })
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
