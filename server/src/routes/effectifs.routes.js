const { logActivity } = require('../utils/logger')
const { logHistorique } = require('../utils/historique')
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
      SELECT e.*, g.nom_complet AS grade_nom, g.categorie AS grade_categorie, g.rang AS grade_rang, u.nom AS unite_nom, u.code AS unite_code
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
    logHistorique(effectifId, 'creation', `Création de la fiche — ${f.prenom} ${f.nom}`)

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

// PUT /api/effectifs/:id/reserve — Toggle réserve
router.put('/:id/reserve', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isRecenseur) return res.status(403).json({ success: false, message: 'Non autorisé' })
    const eff = await queryOne('SELECT * FROM effectifs WHERE id = ?', [req.params.id])
    if (!eff) return res.status(404).json({ success: false, message: 'Effectif introuvable' })

    const unite716 = await queryOne("SELECT id FROM unites WHERE code = '716'")
    if (!unite716) return res.status(500).json({ success: false, message: 'Unité 716 Reserve introuvable' })

    if (!eff.en_reserve) {
      // Passer en réserve: sauvegarder unité/grade d'origine, basculer vers 716
      // Trouver le grade équivalent dans 716
      const gradeOrigine = await queryOne('SELECT * FROM grades WHERE id = ?', [eff.grade_id])
      let grade716 = null
      if (gradeOrigine) {
        grade716 = await queryOne('SELECT id FROM grades WHERE nom_complet = ? AND unite_id = ? LIMIT 1', [gradeOrigine.nom_complet, unite716.id])
      }
      await pool.execute(
        'UPDATE effectifs SET en_reserve = 1, unite_origine_id = ?, grade_origine_id = ?, unite_id = ?, grade_id = ? WHERE id = ?',
        [eff.unite_id, eff.grade_id, unite716.id, grade716 ? grade716.id : eff.grade_id, req.params.id]
      )
      logHistorique(eff.id, 'reserve', `Passage en réserve (716. Reserve)`, { unite_origine: eff.unite_id, grade_origine: eff.grade_id })
      res.json({ success: true, message: 'Effectif mis en réserve' })
    } else {
      // Sortir de réserve: restaurer unité/grade d'origine
      await pool.execute(
        'UPDATE effectifs SET en_reserve = 0, unite_id = COALESCE(unite_origine_id, unite_id), grade_id = COALESCE(grade_origine_id, grade_id), unite_origine_id = NULL, grade_origine_id = NULL WHERE id = ?',
        [req.params.id]
      )
      logHistorique(eff.id, 'reintegration', `Réintégration depuis la réserve`)
      res.json({ success: true, message: 'Effectif sorti de réserve' })
    }
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/effectifs/:id/historique — Full timeline
router.get('/:id/historique', auth, async (req, res) => {
  try {
    const id = req.params.id

    // Manual historique entries
    const historique = await query('SELECT * FROM effectif_historique WHERE effectif_id = ? ORDER BY date_evenement DESC', [id])

    // PDS recap (all weeks)
    const pds = await query('SELECT semaine, total_heures, created_at FROM pds_semaines WHERE effectif_id = ? ORDER BY semaine DESC', [id])

    // Rapports where this person is author
    const rapports = await query(`SELECT id, numero, titre, type, auteur_nom, date_irl, created_at FROM rapports WHERE auteur_id = ? ORDER BY created_at DESC`, [id])

    // Interdits
    const interdits = await query('SELECT * FROM interdits_front WHERE effectif_id = ? ORDER BY created_at DESC', [id])

    // Visites médicales
    const medical = await query('SELECT id, motif, medecin_nom, resultat, date_visite, valide, created_at FROM visites_medicales WHERE effectif_id = ? ORDER BY created_at DESC', [id])

    // Décorations
    const decorations = await query(`
      SELECT ed.*, d.nom AS decoration_nom FROM effectif_decorations ed
      LEFT JOIN decorations d ON d.id = ed.decoration_id
      WHERE ed.effectif_id = ? ORDER BY ed.date_attribution DESC
    `, [id])

    // Affaires (impliqué)
    const affaires = await query(`
      SELECT a.id, a.numero, a.titre, a.statut, ap.role, a.created_at
      FROM affaires_personnes ap JOIN affaires a ON a.id = ap.affaire_id
      WHERE ap.effectif_id = ? ORDER BY a.created_at DESC
    `, [id])

    res.json({ success: true, historique, pds, rapports, interdits, medical, decorations, affaires })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
