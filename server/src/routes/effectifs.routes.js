const { logActivity } = require('../utils/logger')
const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')
const recenseur = require('../middleware/recenseur')
const admin = require('../middleware/admin')
const { upload, handleUploadError } = require('../middleware/upload')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { reconcileForEffectif } = require('../utils/mentions')

// GET /api/effectifs?unite_id=X (guest accessible)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { unite_id } = req.query
    let sql = `
      SELECT e.*, g.nom_complet AS grade_nom, g.categorie AS grade_categorie, u.nom AS unite_nom, u.code AS unite_code
      FROM effectifs e
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
    `
    const params = []
    if (unite_id) { sql += ' WHERE e.unite_id = ?'; params.push(unite_id) }
    sql += ' ORDER BY COALESCE(g.rang, 0) DESC, e.nom ASC'
    const rows = await query(sql, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/effectifs/all (for dropdowns)
router.get('/all', auth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT e.id, e.nom, e.prenom, e.unite_id, e.grade_id,
        g.nom_complet AS grade_nom, u.code AS unite_code
      FROM effectifs e
      LEFT JOIN grades g ON e.grade_id = g.id
      LEFT JOIN unites u ON e.unite_id = u.id
      ORDER BY e.nom, e.prenom
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/effectifs/:id (guest accessible)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const row = await queryOne(`
      SELECT e.*, g.nom_complet AS grade_nom, u.nom AS unite_nom, u.code AS unite_code
      FROM effectifs e
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      WHERE e.id = ?
    `, [req.params.id])
    if (!row) return res.status(404).json({ success: false, message: 'Effectif non trouvé' })
    res.json({ success: true, data: row })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/effectifs (admin ou recenseur)
// Auto-creates a user account + links effectif_id
router.post('/', auth, recenseur, async (req, res) => {
  try {
    const f = req.body
    const [result] = await pool.execute(
      `INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, fonction, categorie, specialite, 
        date_naissance, lieu_naissance, nationalite, taille_cm,
        arme_principale, arme_secondaire, equipement_special, tenue,
        historique, date_entree_ig, date_entree_irl, discord_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [f.nom, f.prenom, f.surnom || null, f.unite_id || null, f.grade_id || null,
       f.fonction || null, f.categorie || null, f.specialite || null,
       f.date_naissance || null, f.lieu_naissance || null,
       f.nationalite || 'Allemande', f.taille_cm || null,
       f.arme_principale || null, f.arme_secondaire || null,
       f.equipement_special || null, f.tenue || null,
       f.historique || null, f.date_entree_ig || null, f.date_entree_irl || null,
       f.discord_id || null]
    )
    const effectifId = result.insertId

    logActivity(req, 'create_effectif', 'effectif', effectifId, `${f.prenom} ${f.nom}`)

    // Discord notification
    const { notifyEffectif } = require('../utils/discordNotify')
    notifyEffectif({ prenom: f.prenom, nom: f.nom, grade_nom: '', unite_nom: '' }).catch(() => {})

    // Auto-reconcile mentions
    if (f.nom && f.prenom) {
      reconcileForEffectif(effectifId, f.nom, f.prenom).catch(() => {})
    }

    // Auto-create user account
    const username = `${(f.prenom || '').toLowerCase()}.${(f.nom || '').toLowerCase()}`.replace(/[^a-z0-9.]/g, '')
    const tempPassword = crypto.randomBytes(4).toString('hex') // 8-char random
    const hash = await bcrypt.hash(tempPassword, 10)

    // Check if username already exists, append number if so
    let finalUsername = username
    let attempt = 0
    while (true) {
      const existing = await queryOne('SELECT id FROM users WHERE username = ?', [finalUsername])
      if (!existing) break
      attempt++
      finalUsername = `${username}${attempt}`
    }

    const [userResult] = await pool.execute(
      `INSERT INTO users (username, password_hash, nom, prenom, unite_id, grade_id, effectif_id, must_change_password, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [finalUsername, hash, f.nom, f.prenom, f.unite_id || null, f.grade_id || null, effectifId]
    )

    res.json({ 
      success: true, 
      data: { 
        id: effectifId, 
        account: { username: finalUsername, tempPassword, userId: userResult.insertId },
        discord_id: f.discord_id || null
      } 
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/effectifs/:id (admin ou recenseur)
router.put('/:id', auth, recenseur, async (req, res) => {
  try {
    const f = req.body
    await pool.execute(
      `UPDATE effectifs SET nom=?, prenom=?, surnom=?, unite_id=?, grade_id=?, fonction=?, categorie=?, specialite=?,
        date_naissance=?, lieu_naissance=?, nationalite=?, taille_cm=?,
        arme_principale=?, arme_secondaire=?, equipement_special=?, tenue=?,
        historique=?, date_entree_ig=?, date_entree_irl=?, discord_id=?
       WHERE id=?`,
      [f.nom, f.prenom, f.surnom || null, f.unite_id || null, f.grade_id || null,
       f.fonction || null, f.categorie || null, f.specialite || null,
       f.date_naissance || null, f.lieu_naissance || null,
       f.nationalite || 'Allemande', f.taille_cm || null,
       f.arme_principale || null, f.arme_secondaire || null,
       f.equipement_special || null, f.tenue || null,
       f.historique || null, f.date_entree_ig || null, f.date_entree_irl || null,
       f.discord_id || null, req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/effectifs/:id/photo — Upload photo d'identité
router.post('/:id/photo', auth, recenseur, upload.single('photo'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier' })
    const photoUrl = `/uploads/${req.file.destination.split('/uploads/')[1]}/${req.file.filename}`
    await pool.execute('UPDATE effectifs SET photo = ? WHERE id = ?', [photoUrl, req.params.id])
    res.json({ success: true, data: { photo: photoUrl } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/effectifs/:id (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM effectifs WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/effectifs/:id/layout — Get layout blocks
router.get('/:id/layout', auth, async (req, res) => {
  try {
    const row = await queryOne('SELECT layout_json FROM effectif_layouts WHERE effectif_id = ?', [req.params.id])
    if (!row || !row.layout_json) return res.json({ blocks: null })
    const data = typeof row.layout_json === 'string' ? JSON.parse(row.layout_json) : row.layout_json
    res.json(data)
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/effectifs/:id/layout — Save layout blocks
router.put('/:id/layout', auth, async (req, res) => {
  try {
    const { blocks, html_published } = req.body
    const json = JSON.stringify({ blocks, html_published })
    await pool.execute(
      `INSERT INTO effectif_layouts (effectif_id, layout_json) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE layout_json = VALUES(layout_json)`,
      [req.params.id, json]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/effectifs/:id/signature — Get saved personal signature
router.get('/:id/signature', auth, async (req, res) => {
  try {
    const row = await queryOne('SELECT signature_data FROM signatures_effectifs WHERE effectif_id = ?', [req.params.id])
    res.json(row || { signature_data: null })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/effectifs/:id/signature — Save personal signature (only own)
router.put('/:id/signature', auth, async (req, res) => {
  try {
    if (parseInt(req.params.id) !== req.user.effectif_id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Vous ne pouvez sauvegarder que votre propre signature' })
    }
    const { signature_data } = req.body
    await query(
      `INSERT INTO signatures_effectifs (effectif_id, signature_data) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE signature_data = ?`,
      [req.params.id, signature_data, signature_data]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
