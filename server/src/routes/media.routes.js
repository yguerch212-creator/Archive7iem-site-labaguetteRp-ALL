const router = require('express').Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { query, queryOne } = require('../config/db')
const auth = require('../middleware/auth')

const UPLOAD_DIR = path.join(__dirname, '../../uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'video/mp4', 'video/webm', 'video/quicktime'
]
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Type de fichier non autorisé'))
  }
})

// POST /api/media/upload — Upload file (auto goes to moderation for images/videos)
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier' })

    const { context_type, context_id } = req.body
    const isMedia = req.file.mimetype.startsWith('image/') || req.file.mimetype.startsWith('video/')
    // PDFs don't need moderation, only images/videos
    const statut = isMedia ? 'en_attente' : 'approuve'

    const result = await query(`
      INSERT INTO media_uploads (filename, original_name, mime_type, size_bytes, context_type, context_id, uploaded_by, statut)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [req.file.filename, req.file.originalname, req.file.mimetype, req.file.size,
        context_type || 'document', context_id || null, req.user.id, statut])

    res.json({
      success: true,
      data: {
        id: result.insertId,
        filename: req.file.filename,
        statut,
        needsModeration: isMedia,
        url: `/api/media/file/${req.file.filename}`
      }
    })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: err.message || 'Erreur upload' })
  }
})

// GET /api/media/file/:filename — Serve file (only if approved or own upload or admin)
router.get('/file/:filename', auth, async (req, res) => {
  try {
    const media = await queryOne('SELECT * FROM media_uploads WHERE filename = ?', [req.params.filename])
    if (!media) return res.status(404).json({ error: 'Fichier introuvable' })

    // Allow if approved, or uploader, or admin
    if (media.statut !== 'approuve' && media.uploaded_by !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Fichier en attente de modération' })
    }

    const filePath = path.join(UPLOAD_DIR, media.filename)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier non trouvé' })

    res.setHeader('Content-Type', media.mime_type)
    res.setHeader('Content-Disposition', `inline; filename="${media.original_name}"`)
    fs.createReadStream(filePath).pipe(res)
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/media/pending — List pending moderation (admin/officier/feld)
router.get('/pending', auth, async (req, res) => {
  if (!req.user.isAdmin && !req.user.isOfficier) return res.status(403).json({ error: 'Non autorisé' })
  try {
    const rows = await query(`
      SELECT m.*, u.username as uploaded_by_username
      FROM media_uploads m
      LEFT JOIN users u ON m.uploaded_by = u.id
      WHERE m.statut = 'en_attente'
      ORDER BY m.created_at DESC
    `)
    res.json({ data: rows })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/media/context/:type/:id — Get approved media for a context
router.get('/context/:type/:id', auth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT id, filename, original_name, mime_type, size_bytes, statut, created_at
      FROM media_uploads
      WHERE context_type = ? AND context_id = ? AND statut = 'approuve'
      ORDER BY created_at
    `, [req.params.type, req.params.id])
    res.json({ data: rows })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/media/:id/moderate — Approve or refuse
router.put('/:id/moderate', auth, async (req, res) => {
  if (!req.user.isAdmin && !req.user.isOfficier) return res.status(403).json({ error: 'Non autorisé' })
  const { decision } = req.body // 'approuve' or 'refuse'
  if (!['approuve', 'refuse'].includes(decision)) return res.status(400).json({ error: 'Decision invalide' })

  try {
    await query(`
      UPDATE media_uploads SET statut = ?, moderated_by = ?, moderated_at = NOW()
      WHERE id = ?
    `, [decision, req.user.id, req.params.id])

    // If refused, delete the file
    if (decision === 'refuse') {
      const media = await queryOne('SELECT filename FROM media_uploads WHERE id = ?', [req.params.id])
      if (media) {
        const filePath = path.join(UPLOAD_DIR, media.filename)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      }
    }

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
