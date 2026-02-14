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

// GET /api/rapports/templates/list
router.get('/templates/list', auth, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM rapport_templates ORDER BY type, nom')
    res.json({ success: true, data: rows })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/rapports (guest: only published+approved, user: all)
router.get('/', optionalAuth, async (req, res) => {
  try {
    let where = ''
    if (req.user.isGuest) {
      where = "WHERE r.published = 1 AND (r.moderation_statut = 'approuve' OR r.moderation_statut IS NULL OR r.moderation_statut = 'brouillon')"
    }
    const rows = await query(`
      SELECT r.id, r.titre, r.auteur_nom, r.auteur_grade, r.personne_renseignee_nom, r.recommande_nom, r.mise_en_cause_nom, 
        r.type, r.date_rp, r.date_irl, r.published, r.moderation_statut, r.a_images, r.created_at,
        r.valide, r.valide_par_nom, r.valide_at, r.auteur_rang,
        COALESCE(r.personne_renseignee_nom, r.recommande_nom, r.mise_en_cause_nom) AS personne_mentionnee,
        u.code AS auteur_unite_code, u.nom AS auteur_unite_nom,
        r.affaire_id, r.pris_par_nom, r.pris_at
      FROM rapports r
      LEFT JOIN effectifs e ON e.id = r.auteur_id
      LEFT JOIN unites u ON u.id = e.unite_id
      ${where}
      ORDER BY r.created_at DESC
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
      `INSERT INTO rapports (type, titre, auteur_nom, auteur_grade, auteur_id, personne_renseignee_nom,
        unite_id, grade_id, contexte, resume, bilan, remarques,
        recommande_nom, recommande_grade, raison_1, recompense,
        intro_nom, intro_grade, mise_en_cause_nom, mise_en_cause_grade,
        lieu_incident, compte_rendu, signature_nom, signature_grade,
        date_rp, date_irl)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [f.type || 'rapport', f.titre, f.auteur_nom || null, f.auteur_grade || null, f.auteur_id || null,
       f.personne_renseignee_nom || null, f.unite_id || null, f.grade_id || null,
       f.contexte || null, f.resume || null, f.bilan || null, f.remarques || null,
       f.recommande_nom || null, f.recommande_grade || null, f.raison_1 || null, f.recompense || null,
       f.intro_nom || null, f.intro_grade || null, f.mise_en_cause_nom || null, f.mise_en_cause_grade || null,
       f.lieu_incident || null, f.compte_rendu || null, f.signature_nom || null, f.signature_grade || null,
       f.date_rp || null, f.date_irl || null]
    )
    const rapportId = result.insertId

    // Set auteur_rang + auto-validate for officiers
    const auteurRang = req.user.grade_rang || 0
    const isOfficier = req.user.isOfficier || req.user.isAdmin
    if (isOfficier) {
      await pool.execute(
        'UPDATE rapports SET auteur_rang = ?, valide = 1, valide_par = ?, valide_par_nom = ?, valide_at = NOW(), valide_signature = ? WHERE id = ?',
        [auteurRang, req.user.id, `${req.user.prenom || ''} ${req.user.nom || req.user.username}`.trim(), 'Auto-validé (Officier)', rapportId]
      )
    } else {
      await pool.execute('UPDATE rapports SET auteur_rang = ? WHERE id = ?', [auteurRang, rapportId])
    }

    logActivity(req, 'create_rapport', 'rapport', rapportId, `${f.type}: ${f.titre}`)

    // Discord notification
    const { notifyRapport } = require('../utils/discordNotify')
    notifyRapport({ type: f.type, titre: f.titre, numero: '', date_rp: f.date_rp }, f.auteur_nom).catch(() => {})

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

// PUT /api/rapports/:id/publish — Soumettre pour validation
router.put('/:id/publish', auth, async (req, res) => {
  try {
    const rapport = await queryOne('SELECT * FROM rapports WHERE id = ?', [req.params.id])
    if (!rapport) return res.status(404).json({ success: false, message: 'Rapport introuvable' })

    // If officier/admin → auto-validate + publish
    const isOfficier = req.user.isOfficier || req.user.isAdmin
    if (isOfficier) {
      const validatorName = `${req.user.prenom || ''} ${req.user.nom || req.user.username}`.trim()
      // Get saved signature
      let sigData = null
      if (req.user.effectif_id) {
        const saved = await queryOne('SELECT signature_data FROM signatures_effectifs WHERE effectif_id = ?', [req.user.effectif_id])
        if (saved) sigData = saved.signature_data
      }
      await pool.execute(
        `UPDATE rapports SET published = 1, valide = 1, valide_par = ?, valide_par_nom = ?, valide_signature = ?, valide_at = NOW(),
         signature_image = COALESCE(?, signature_image) WHERE id = ?`,
        [req.user.id, validatorName, sigData || 'Auto-validé (Officier)', sigData, req.params.id]
      )
    } else {
      // Just mark as submitted (published=1, awaiting validation)
      await pool.execute('UPDATE rapports SET published = 1 WHERE id = ?', [req.params.id])
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

// PUT /api/rapports/:id/prendre-en-charge — Feldgendarmerie takes incident, creates affaire
router.put('/:id/prendre-en-charge', auth, async (req, res) => {
  try {
    if (!req.user.isFeldgendarmerie && !req.user.isOfficier) {
      return res.status(403).json({ success: false, message: 'Réservé à la Feldgendarmerie et aux officiers' })
    }
    const rapport = await queryOne('SELECT * FROM rapports WHERE id = ?', [req.params.id])
    if (!rapport) return res.status(404).json({ success: false, message: 'Rapport introuvable' })
    if (rapport.type !== 'incident') return res.status(400).json({ success: false, message: 'Seuls les rapports d\'incident peuvent être pris en charge' })
    if (rapport.affaire_id) return res.status(400).json({ success: false, message: 'Ce rapport est déjà lié à une affaire' })

    // Generate affaire number
    const year = new Date().getFullYear()
    const lastAff = await queryOne("SELECT numero FROM affaires WHERE numero LIKE ? ORDER BY id DESC LIMIT 1", [`AFF-${year}-%`])
    let seq = 1
    if (lastAff) seq = parseInt(lastAff.numero.split('-')[2]) + 1
    const numero = `AFF-${year}-${String(seq).padStart(3, '0')}`

    const feldName = `${req.user.prenom || ''} ${req.user.nom || req.user.username}`.trim()

    // Create affaire
    const [affResult] = await pool.execute(
      `INSERT INTO affaires (numero, titre, resume, statut, created_by) VALUES (?, ?, ?, 'Ouverte', ?)`,
      [numero, `Incident — ${rapport.titre}`, `Affaire ouverte suite au rapport d'incident: ${rapport.titre}`, req.user.id]
    )
    const affaireId = affResult.insertId

    // Add the incident rapport as a pièce
    await pool.execute(
      `INSERT INTO affaires_pieces (affaire_id, type, titre, contenu, date_rp, date_irl, redige_par, redige_par_nom, confidentiel, created_by)
       VALUES (?, 'Autre', ?, ?, ?, ?, ?, ?, 0, ?)`,
      [affaireId, `Rapport d'incident — ${rapport.titre}`,
       `Lieu: ${rapport.lieu_incident || '—'}\nCompte-rendu: ${rapport.compte_rendu || '—'}\nAuteur: ${rapport.auteur_nom || '—'}\nMis en cause: ${rapport.mise_en_cause_nom || '—'}`,
       rapport.date_rp, rapport.date_irl, rapport.auteur_id, rapport.auteur_nom, req.user.id]
    )

    // Add mis en cause as accusé if present
    if (rapport.mise_en_cause_nom) {
      await pool.execute(
        `INSERT INTO affaires_personnes (affaire_id, role, nom_libre) VALUES (?, 'Accuse', ?)`,
        [affaireId, rapport.mise_en_cause_nom]
      )
    }

    // Update rapport with affaire link
    await pool.execute(
      'UPDATE rapports SET affaire_id = ?, pris_par_id = ?, pris_par_nom = ?, pris_at = NOW() WHERE id = ?',
      [affaireId, req.user.effectif_id || req.user.id, feldName, req.params.id]
    )

    // Send telegram to rapport author
    if (rapport.auteur_id) {
      const auteurEff = await queryOne('SELECT nom, prenom FROM effectifs WHERE id = ?', [rapport.auteur_id])
      const auteurFullName = auteurEff ? `${auteurEff.prenom || ''} ${auteurEff.nom || ''}`.trim() : (rapport.auteur_nom || 'Inconnu')
      const [telResult] = await pool.execute(
        `INSERT INTO telegrammes (numero, expediteur_id, expediteur_nom, destinataire_id, destinataire_nom, objet, contenu, priorite, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Urgent', ?)`,
        [`TEL-AUTO-${Date.now()}`,
         req.user.effectif_id || null,
         feldName,
         rapport.auteur_id,
         auteurFullName,
         `Rapport d'incident pris en charge`,
         `Votre rapport d'incident "${rapport.titre}" a été pris en charge par ${feldName} de la Feldgendarmerie.\n\nAffaire ${numero} ouverte.\n\nVous serez informé de l'avancement de la procédure.`,
         req.user.id]
      )
      // Add author as destinataire
      if (telResult.insertId) {
        await pool.execute(
          'INSERT INTO telegramme_destinataires (telegramme_id, effectif_id) VALUES (?, ?)',
          [telResult.insertId, rapport.auteur_id]
        )
      }
    }

    logActivity(req, 'incident_pris_en_charge', 'rapport', rapport.id, `Incident pris en charge par ${feldName} → Affaire ${numero}`)

    res.json({ success: true, data: { affaire_id: affaireId, numero } })
  } catch (err) {
    console.error('Prendre en charge error:', err)
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

// (Duplicate /publish route removed — handled above)

// GET /api/rapports/:id/layout — Get layout blocks
router.get('/:id/layout', auth, async (req, res) => {
  try {
    const row = await queryOne('SELECT layout_json FROM rapport_layouts WHERE rapport_id = ?', [req.params.id])
    if (!row || !row.layout_json) return res.json({ blocks: null })
    const data = typeof row.layout_json === 'string' ? JSON.parse(row.layout_json) : row.layout_json
    res.json(data)
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/rapports/:id/layout — Save layout blocks
router.put('/:id/layout', auth, async (req, res) => {
  try {
    const { blocks, html_published } = req.body
    const json = JSON.stringify({ blocks, html_published })
    await pool.execute(
      `INSERT INTO rapport_layouts (rapport_id, layout_json) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE layout_json = VALUES(layout_json)`,
      [req.params.id, json]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/rapports/:id/validate — Validate rapport (hierarchical chain)
router.put('/:id/validate', auth, async (req, res) => {
  try {
    const rapport = await queryOne('SELECT * FROM rapports WHERE id = ?', [req.params.id])
    if (!rapport) return res.status(404).json({ success: false, message: 'Rapport introuvable' })
    if (rapport.valide) return res.status(400).json({ success: false, message: 'Rapport déjà validé' })

    const validatorRang = req.user.grade_rang || 0
    const auteurRang = rapport.auteur_rang || 0

    // HDR (rang < 35) → SO (35+) ou OFF (60+) peut valider
    // SO (35-59) → OFF (60+) peut valider
    // OFF (60+) → auto-validé (shouldn't reach here)
    if (auteurRang < 35 && validatorRang < 35) {
      return res.status(403).json({ success: false, message: 'Seul un sous-officier ou officier peut valider ce rapport' })
    }
    if (auteurRang >= 35 && auteurRang < 60 && validatorRang < 60) {
      return res.status(403).json({ success: false, message: 'Seul un officier peut valider le rapport d\'un sous-officier' })
    }

    // Get validator's saved signature or use the provided one
    const { signature_data } = req.body
    let sigData = signature_data
    if (!sigData && req.user.effectif_id) {
      const saved = await queryOne('SELECT signature_data FROM signatures_effectifs WHERE effectif_id = ?', [req.user.effectif_id])
      if (saved) sigData = saved.signature_data
    }

    const validatorName = `${req.user.prenom || ''} ${req.user.nom || req.user.username}`.trim()
    // Validate AND auto-publish — signature goes on document
    await pool.execute(
      `UPDATE rapports SET valide = 1, published = 1, valide_par = ?, valide_par_nom = ?, valide_signature = ?, valide_at = NOW(),
       signature_image = COALESCE(?, signature_image),
       signature_nom = COALESCE(signature_nom, ?),
       signature_grade = COALESCE(signature_grade, ?)
       WHERE id = ?`,
      [req.user.id, validatorName, sigData || null, sigData, validatorName, req.user.grade || '', req.params.id]
    )

    // Save signature if new
    if (sigData && req.user.effectif_id) {
      await query(
        `INSERT INTO signatures_effectifs (effectif_id, signature_data) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE signature_data = VALUES(signature_data)`,
        [req.user.effectif_id, sigData]
      ).catch(() => {})
    }

    logActivity(req, 'validate_rapport', 'rapport', req.params.id, `Validé par ${validatorName}`)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/rapports/templates/list — rapport templates
module.exports = router
