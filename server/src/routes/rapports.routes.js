const { logActivity } = require('../utils/logger')
const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')
const admin = require('../middleware/admin')
const { saveMention } = require('../utils/mentions')

// GET /api/rapports/next-number?type=rapport
router.get('/next-number', auth, async (req, res) => {
  try {
    const type = req.query.type || 'rapport'
    const prefix = type === 'rapport' ? 'RJ' : type === 'recommandation' ? 'RC' : 'IN'
    const year = new Date().getFullYear()
    const row = await queryOne(
      `SELECT COUNT(*) as cnt FROM rapports WHERE type = ? AND YEAR(created_at) = ?`,
      [type, year]
    )
    const num = String((row?.cnt || 0) + 1).padStart(3, '0')
    res.json({ success: true, data: { numero: `${prefix}-${year}-${num}` } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/rapports (guest: only published+approved, user: all)
router.get('/', optionalAuth, async (req, res) => {
  try {
    let where = ''
    if (req.user.isGuest) {
      where = "WHERE published = 1 AND (moderation_statut = 'approuve' OR moderation_statut IS NULL OR moderation_statut = 'brouillon')"
    }
    const rows = await query(`
      SELECT id, titre, auteur_nom, personne_renseignee_nom, recommande_nom, mise_en_cause_nom, 
        type, date_rp, date_irl, published, moderation_statut, a_images, created_at,
        COALESCE(personne_renseignee_nom, recommande_nom, mise_en_cause_nom) AS personne_mentionnee
      FROM rapports ${where} ORDER BY created_at DESC
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/rapports/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM rapports WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ success: false, message: 'Rapport non trouvé' })
    res.json({ success: true, data: row })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/rapports
router.post('/', auth, async (req, res) => {
  try {
    const f = req.body
    const [result] = await pool.execute(
      `INSERT INTO rapports (type, titre, auteur_nom, auteur_id, personne_renseignee_nom,
        unite_id, grade_id, contexte, resume, bilan, remarques,
        recommande_nom, recommande_grade, raison_1, recompense,
        intro_nom, intro_grade, mise_en_cause_nom, mise_en_cause_grade,
        lieu_incident, compte_rendu, signature_nom, signature_grade,
        date_rp, date_irl)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [f.type || 'rapport', f.titre, f.auteur_nom || null, f.auteur_id || null,
       f.personne_renseignee_nom || null, f.unite_id || null, f.grade_id || null,
       f.contexte || null, f.resume || null, f.bilan || null, f.remarques || null,
       f.recommande_nom || null, f.recommande_grade || null, f.raison_1 || null, f.recompense || null,
       f.intro_nom || null, f.intro_grade || null, f.mise_en_cause_nom || null, f.mise_en_cause_grade || null,
       f.lieu_incident || null, f.compte_rendu || null, f.signature_nom || null, f.signature_grade || null,
       f.date_rp || null, f.date_irl || null]
    )
    const rapportId = result.insertId
    logActivity(req, 'create_rapport', 'rapport', rapportId, `${f.type}: ${f.titre}`)

    // Save mentions for name fields
    const mentionFields = [
      ['auteur_nom', f.auteur_nom, f.auteur_id],
      ['recommande_nom', f.recommande_nom, null],
      ['mise_en_cause_nom', f.mise_en_cause_nom, null],
      ['intro_nom', f.intro_nom, null],
      ['personne_renseignee_nom', f.personne_renseignee_nom, null]
    ]
    for (const [champ, nom, effId] of mentionFields) {
      if (nom) saveMention('rapport', rapportId, champ, nom, effId || null).catch(() => {})
    }

    res.json({ success: true, data: { id: rapportId } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/rapports/:id/publish
router.put('/:id/publish', auth, async (req, res) => {
  try {
    const { contenu_html, signature_nom, signature_grade, stamp, signature_canvas } = req.body
    await pool.execute(
      `UPDATE rapports SET contenu_html = ?, published = 1,
        signature_nom = COALESCE(?, signature_nom),
        signature_grade = COALESCE(?, signature_grade),
        stamp = COALESCE(?, stamp),
        signature_image = COALESCE(?, signature_image)
       WHERE id = ?`,
      [contenu_html, signature_nom || null, signature_grade || null, stamp || null, signature_canvas || null, req.params.id]
    )
    // Save personal signature if provided
    if (signature_canvas && req.user.effectif_id) {
      await pool.execute(
        `INSERT INTO signatures_effectifs (effectif_id, signature_data) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE signature_data = VALUES(signature_data)`,
        [req.user.effectif_id, signature_canvas]
      )
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/rapports/:id/redact — Officier censure des zones
router.put('/:id/redact', auth, async (req, res) => {
  try {
    if (!req.user.isOfficier && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Réservé aux officiers' })
    }
    const { redactions } = req.body // Array of {field, start, end} or {field, value: "█████"}
    await pool.execute('UPDATE rapports SET redactions = ? WHERE id = ?', [JSON.stringify(redactions), req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/rapports/moderation — Rapports en attente (admin)
router.get('/moderation/queue', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: 'Admin requis' })
    const rows = await query(`
      SELECT id, titre, auteur_nom, type, a_images, moderation_statut, created_at
      FROM rapports WHERE moderation_statut = 'en_attente'
      ORDER BY created_at ASC
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/rapports/:id/moderate — Approuver/refuser (admin)
router.put('/:id/moderate', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: 'Admin requis' })
    const { decision, raison } = req.body // decision: 'approuve' | 'refuse'
    await pool.execute('UPDATE rapports SET moderation_statut = ? WHERE id = ?', [decision, req.params.id])
    
    if (decision === 'refuse' && raison) {
      await pool.execute(`
        INSERT INTO moderation_queue (type, record_id, statut, soumis_par, modere_par, raison_refus, modere_at)
        SELECT 'rapport', ?, 'refuse', auteur_id, ?, ?, NOW() FROM rapports WHERE id = ?
      `, [req.params.id, req.user.id, raison, req.params.id])
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/rapports/:id (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM rapports WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/rapports/:id/publish — Publish with auto-layout
router.put('/:id/publish', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isRecenseur && !req.user.isOfficier) {
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    }
    const { contenu_html, signature_nom, signature_grade, stamp } = req.body
    await pool.execute(
      'UPDATE rapports SET published = 1, contenu_html = ?, signature_nom = ?, signature_grade = ?, stamp = ? WHERE id = ?',
      [contenu_html || null, signature_nom || null, signature_grade || null, stamp || null, req.params.id]
    )
    logActivity(req, 'publish_rapport', 'rapport', parseInt(req.params.id))
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
