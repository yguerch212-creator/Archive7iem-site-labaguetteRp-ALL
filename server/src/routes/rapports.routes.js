const { logActivity } = require('../utils/logger')
const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')
const admin = require('../middleware/admin')
const { saveMention } = require('../utils/mentions')

// Helper: convertir date FR (dd/mm/yyyy) → MySQL (yyyy-mm-dd)
function convertDateFR(dateStr) {
  if (!dateStr) return null
  const m = String(dateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  // Already yyyy-mm-dd or other format, return as-is
  return dateStr
}

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
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// GET /api/rapports/templates/list
router.get('/templates/list', auth, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM rapport_templates ORDER BY type, nom')
    res.json({ success: true, data: rows })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// GET /api/rapports (guest: only published+approved, user: all)
router.get('/', optionalAuth, async (req, res) => {
  try {
    let where = ''
    if (req.user.isGuest) {
      where = "WHERE r.published = 1 AND (r.moderation_statut = 'approuve' OR r.moderation_statut IS NULL OR r.moderation_statut = 'brouillon')"
    }
    const rows = await query(`
      SELECT r.id, r.titre, r.auteur_nom, r.auteur_grade, r.auteur_id, r.personne_renseignee_nom, r.recommande_nom, r.mise_en_cause_nom, 
        r.type, r.date_rp, r.date_irl, r.published, r.moderation_statut, r.a_images, r.created_at,
        r.valide, r.valide_par_nom, r.valide_at, r.auteur_rang,
        COALESCE(r.personne_renseignee_nom, r.recommande_nom, r.mise_en_cause_nom) AS personne_mentionnee,
        u.code AS auteur_unite_code, u.nom AS auteur_unite_nom,
        r.affaire_id, r.pris_par_nom, r.pris_at
      FROM rapports r
      LEFT JOIN effectifs e ON e.id = r.auteur_id
      LEFT JOIN unites u ON u.id = COALESCE(e.unite_id, r.unite_id)
      ${where}
      ORDER BY r.date_irl DESC, r.created_at DESC
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// GET /api/rapports/:id
// POST /api/rapports/analyse-ia — Analyse IA du contenu des rapports via Groq
router.post('/analyse-ia', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) {
      return res.status(403).json({ success: false, message: 'Accès réservé' })
    }
    
    const GROQ_API_KEY = process.env.GROQ_API_KEY
    if (!GROQ_API_KEY) {
      return res.status(500).json({ success: false, message: 'GROQ_API_KEY non configurée' })
    }

    const { periode, date_debut, date_fin, include_front } = req.body
    
    let startDate, endDate
    const now = new Date()
    if (periode === 'mois') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0,10)
    } else if (periode === 'custom' && date_debut && date_fin) {
      startDate = date_debut; endDate = date_fin
    } else {
      const d = new Date(now); const day = d.getDay()
      const diff = day >= 5 ? day - 5 : day + 2
      const fri = new Date(d); fri.setDate(d.getDate() - diff)
      const friEnd = new Date(fri); friEnd.setDate(fri.getDate() + 7)
      startDate = fri.toISOString().slice(0,10); endDate = friEnd.toISOString().slice(0,10)
    }

    const rapports = await query(`
      SELECT r.id, r.type, r.titre, r.auteur_nom, r.auteur_grade, r.date_rp, r.date_irl,
        r.contexte, r.resume, r.bilan, r.remarques, r.compte_rendu, r.lieu_incident,
        r.personne_renseignee_nom, r.recommande_nom, r.mise_en_cause_nom,
        r.raison_1, r.recompense, r.valide, r.published,
        u.code AS unite_code, u.nom AS unite_nom
      FROM rapports r
      LEFT JOIN effectifs e ON e.id = r.auteur_id
      LEFT JOIN unites u ON u.id = e.unite_id
      WHERE DATE(r.created_at) >= ? AND DATE(r.created_at) <= ?
      ORDER BY r.date_rp ASC, r.created_at ASC
    `, [startDate, endDate])

    if (rapports.length === 0) {
      return res.json({ success: true, data: { analyse: 'Aucun rapport trouvé pour cette période.', rapports_count: 0 } })
    }

    let rapportsText = rapports.map((r, i) => {
      let text = `--- RAPPORT #${i+1} ---\nType: ${r.type}\nTitre: ${r.titre}\nAuteur: ${r.auteur_grade || ''} ${r.auteur_nom || 'Inconnu'}\nUnité: ${r.unite_code || '?'} ${r.unite_nom || ''}\nDate RP: ${r.date_rp || '?'}\nDate IRL: ${r.date_irl || '?'}\n`
      if (r.contexte) text += `Contexte: ${r.contexte}\n`
      if (r.resume) text += `Résumé: ${r.resume}\n`
      if (r.bilan) text += `Bilan: ${r.bilan}\n`
      if (r.remarques) text += `Remarques: ${r.remarques}\n`
      if (r.compte_rendu) text += `Compte-rendu: ${r.compte_rendu}\n`
      if (r.lieu_incident) text += `Lieu: ${r.lieu_incident}\n`
      if (r.personne_renseignee_nom) text += `Personne renseignée: ${r.personne_renseignee_nom}\n`
      if (r.recommande_nom) text += `Recommandé: ${r.recommande_nom} — Raison: ${r.raison_1 || '?'} — Récompense: ${r.recompense || '?'}\n`
      if (r.mise_en_cause_nom) text += `Mis en cause: ${r.mise_en_cause_nom}\n`
      return text
    }).join('\n')

    let frontText = ''
    if (include_front) {
      const frontEvents = await query(`
        SELECT e.type_event, e.camp_vainqueur, e.heure, e.date_irl, c.nom AS carte_nom, v.nom AS vp_nom, v.numero AS vp_numero
        FROM situation_front_events e
        LEFT JOIN situation_front_cartes c ON c.id = e.carte_id
        LEFT JOIN situation_front_vp v ON v.id = e.vp_id
        WHERE DATE(e.date_irl) >= ? AND DATE(e.date_irl) <= ?
        ORDER BY e.date_irl ASC
      `, [startDate, endDate])
      
      if (frontEvents.length > 0) {
        frontText = '\n\n--- DONNÉES DU FRONT (même période) ---\n'
        frontText += frontEvents.map(e => {
          let line = `[${e.date_irl ? new Date(e.date_irl).toLocaleDateString('fr-FR') : '?'}] ${e.carte_nom}: `
          if (e.type_event === 'attaque') line += `Attaque base US → Win ${e.camp_vainqueur === 'allemand' ? 'ALL' : 'US'}`
          else if (e.type_event === 'defense') line += `Défense base ALL → Win ${e.camp_vainqueur === 'allemand' ? 'ALL' : 'US'}`
          else if (e.type_event === 'prise') line += `Prise VP${e.vp_numero} ${e.vp_nom || ''}`
          else if (e.type_event === 'perte') line += `Perte VP${e.vp_numero} ${e.vp_nom || ''}`
          else if (e.type_event === 'debut') line += 'Début des combats'
          else if (e.type_event === 'fin') line += 'Fin des combats'
          if (e.heure) line += ` à ${e.heure}`
          return line
        }).join('\n')
      }

      const pdsStats = await query(`
        SELECT COUNT(*) as total, SUM(CASE WHEN valide = 1 THEN 1 ELSE 0 END) as valides,
          ROUND(AVG(total_heures), 1) as moy_heures
        FROM pds_semaines WHERE semaine = (SELECT MAX(semaine) FROM pds_semaines)
      `)
      if (pdsStats[0]?.total > 0) {
        frontText += `\n\n--- PDS (dernière semaine) ---\n`
        frontText += `Effectifs ayant rempli: ${pdsStats[0].total}\nValidés (>=6h): ${pdsStats[0].valides}\nMoyenne heures: ${pdsStats[0].moy_heures}h\n`
      }
    }

    const prompt = `Tu es l'analyste en chef du 7e Armeekorps (camp allemand, WW2 RP sur Garry's Mod). Tu analyses les rapports soumis par les officiers et sous-officiers.

PÉRIODE ANALYSÉE : ${startDate} → ${endDate}
NOMBRE DE RAPPORTS : ${rapports.length}

${rapportsText}${frontText}

Produis une analyse COMPLÈTE et STRUCTURÉE :

## SYNTHÈSE DE LA PÉRIODE
Résumé global en 3-5 phrases des événements marquants.

## CHRONOLOGIE DES FAITS
Reconstitue la chronologie des événements jour par jour à partir des rapports. Indique dates, lieux, personnes impliquées.

## PERSONNES CLÉS
Liste les personnes mentionnées dans les rapports avec leur rôle (auteur, recommandé, mis en cause, renseigné). Note les récurrences.

## INCIDENTS & RÉSOLUTIONS
Détaille chaque incident reporté, son statut (traité/non traité), et les suites données.

## RECOMMANDATIONS & MÉRITES
Liste les recommandations faites, les raisons et récompenses proposées.

## TENDANCES & OBSERVATIONS
- Quelles unités sont les plus actives dans les rapports ?
- Y a-t-il des patterns (mêmes personnes, mêmes types d'incidents) ?
- Qualité et exhaustivité des rapports soumis

${include_front ? `## CORRÉLATION RAPPORTS × FRONT
Croise les informations des rapports avec les données de combat :
- Les rapports correspondent-ils à ce qui s'est passé sur le terrain ?
- Y a-t-il des événements de front non couverts par des rapports ?
- Impact des incidents sur la performance au combat

## CORRÉLATION RAPPORTS × PDS
- Les unités actives au front remplissent-elles bien leurs PDS ?
- Y a-t-il un lien entre heures de service et performance ?` : ''}

## RECOMMANDATIONS DU COMMANDEMENT
Suggestions concrètes basées sur l'analyse.

RÈGLES :
- Ne JAMAIS inventer de données. Base ton analyse UNIQUEMENT sur les rapports fournis.
- Cite les noms, dates et faits tels qu'ils apparaissent.
- Sois direct et factuel, style rapport d'état-major.
- Si un rapport est vide ou incomplet, signale-le.`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 4000
        }),
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        console.error(`[Groq Rapports] API error ${response.status}: ${errText}`)
        return res.json({ success: false, message: `Groq API error: ${response.status}` })
      }

      const data = await response.json()
      const analyse = data.choices?.[0]?.message?.content
      if (!analyse) {
        return res.json({ success: false, message: 'Réponse vide de Groq' })
      }

      res.json({
        success: true,
        data: {
          analyse,
          rapports_count: rapports.length,
          periode: { debut: startDate, fin: endDate },
          include_front: !!include_front
        }
      })
    } catch (fetchErr) {
      clearTimeout(timeout)
      if (fetchErr.name === 'AbortError') {
        return res.json({ success: false, message: 'Timeout Groq API (30s)' })
      }
      throw fetchErr
    }
  } catch (err) {
    console.error('[Groq Rapports] Error:', err.message)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})


// GET /api/rapports/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM rapports WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ success: false, message: 'Rapport non trouvé' })
    res.json({ success: true, data: row })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
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
        lieu_incident, compte_rendu, signature_nom, signature_grade, signature_image,
        date_rp, date_irl)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [f.type || 'rapport', f.titre, f.auteur_nom || null, f.auteur_grade || null, f.auteur_id || null,
       f.personne_renseignee_nom || null, f.unite_id || null, f.grade_id || null,
       f.contexte || null, f.resume || null, f.bilan || null, f.remarques || null,
       f.recommande_nom || null, f.recommande_grade || null, f.raison_1 || null, f.recompense || null,
       f.intro_nom || null, f.intro_grade || null, f.mise_en_cause_nom || null, f.mise_en_cause_grade || null,
       f.lieu_incident || null, f.compte_rendu || null, f.signature_nom || null, f.signature_grade || null, f.signature_image || null,
       f.date_rp || null, convertDateFR(f.date_irl)]
    )
    const rapportId = result.insertId

    // Set auteur_rang + auto-validate+approve for officiers
    const auteurRang = req.user.grade_rang || 0
    const isOfficier = req.user.isOfficier || req.user.isAdmin
    const officierName = `${req.user.prenom || ''} ${req.user.nom || req.user.username}`.trim()
    if (isOfficier) {
      await pool.execute(
        `UPDATE rapports SET auteur_rang = ?, valide = 1, valide_par = ?, valide_par_nom = ?, valide_at = NOW(), valide_signature = ?,
         approuve_par = ?, approuve_par_nom = ?, approuve_at = NOW(), approuve_signature = ?
         WHERE id = ?`,
        [auteurRang, req.user.id, officierName, 'Auto-validé (Officier)',
         req.user.id, officierName, 'Auto-validé (Officier)', rapportId]
      )
    } else {
      await pool.execute('UPDATE rapports SET auteur_rang = ? WHERE id = ?', [auteurRang, rapportId])
    }

    logActivity(req, 'create_rapport', 'rapport', rapportId, `${f.type}: ${f.titre}`)

    // Discord notification
    const { notifyRapport } = require('../utils/discordNotify')
    notifyRapport({ type: f.type, titre: f.titre, numero: '', date_rp: f.date_rp }, f.auteur_nom).catch(() => {})

    // Notification in-app pour la Feldgendarmerie si c'est un incident
    if (f.type === 'incident') {
      try {
        // Trouver tous les effectifs Feldgendarmerie (via unite ou role)
        const feldUsers = await query(
          `SELECT DISTINCT e.id, u2.id as user_id FROM effectifs e
           LEFT JOIN unites un ON un.id = e.unite_id
           LEFT JOIN users u2 ON u2.effectif_id = e.id
           WHERE un.nom LIKE '%Feldgendarmerie%' OR un.code LIKE '%feld%'`
        )
        for (const feld of feldUsers) {
          if (feld.user_id) {
            await pool.execute(
              `INSERT INTO notifications (user_id, type, titre, message, lien, created_at)
               VALUES (?, 'incident', '🚨 Nouveau rapport d\\'incident', ?, ?, NOW())`,
              [feld.user_id, `Incident signalé par ${f.auteur_nom || 'Inconnu'}: ${f.titre}`, `/rapports/${rapportId}`]
            ).catch(() => {})
          }
        }
      } catch (notifErr) {
        console.error('Erreur notification Feldgendarmerie:', notifErr.message)
      }
    }

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
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// PUT /api/rapports/:id/publish — Soumettre pour validation
router.put('/:id/publish', auth, async (req, res) => {
  try {
    const rapport = await queryOne('SELECT * FROM rapports WHERE id = ?', [req.params.id])
    if (!rapport) return res.status(404).json({ success: false, message: 'Rapport introuvable' })

    // If officier/admin → auto-validate + auto-approve + publish
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
         approuve_par = ?, approuve_par_nom = ?, approuve_signature = ?, approuve_at = NOW()
         WHERE id = ?`,
        [req.user.id, validatorName, sigData || 'Auto-validé (Officier)',
         req.user.id, validatorName, sigData || 'Auto-validé (Officier)', req.params.id]
      )
    } else {
      // Just mark as submitted (published=1, awaiting validation)
      await pool.execute('UPDATE rapports SET published = 1 WHERE id = ?', [req.params.id])
    }
    res.json({ success: true })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
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
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
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
       rapport.date_rp, convertDateFR(rapport.date_irl), rapport.auteur_id, rapport.auteur_nom, req.user.id]
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
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
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
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
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
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// DELETE /api/rapports/:id (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM rapports WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// (Duplicate /publish route removed — handled above)

// GET /api/rapports/:id/layout — Get layout blocks
router.get('/:id/layout', optionalAuth, async (req, res) => {
  try {
    const row = await queryOne('SELECT layout_json FROM rapport_layouts WHERE rapport_id = ?', [req.params.id])
    if (!row || !row.layout_json) return res.json({ blocks: null })
    const data = typeof row.layout_json === 'string' ? JSON.parse(row.layout_json) : row.layout_json
    res.json(data)
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
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
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// PUT /api/rapports/:id/validate — Validate rapport (hierarchical chain)
router.put('/:id/validate', auth, async (req, res) => {
  try {
    const rapport = await queryOne('SELECT * FROM rapports WHERE id = ?', [req.params.id])
    if (!rapport) return res.status(404).json({ success: false, message: 'Rapport introuvable' })
    if (rapport.valide) return res.status(400).json({ success: false, message: 'Rapport déjà validé' })
    if (!rapport.published) return res.status(400).json({ success: false, message: 'Le rapport doit d\'abord être soumis (publié) avant de pouvoir être validé' })

    const validatorRang = req.user.grade_rang || 0
    const auteurRang = rapport.auteur_rang || 0
    const isAdministratif = req.user.isRecenseur

    // Administratifs (recenseurs) can validate any rapport
    // HDR (rang < 35) → SO (35+) ou OFF (60+) ou Administratif peut valider
    // SO (35-59) → OFF (60+) ou Administratif peut valider
    // OFF (60+) → auto-validé (shouldn't reach here)
    if (!isAdministratif && !req.user.isAdmin) {
      if (auteurRang < 35 && validatorRang < 35) {
        return res.status(403).json({ success: false, message: 'Seul un sous-officier, officier ou administratif peut valider ce rapport' })
      }
      if (auteurRang >= 35 && auteurRang < 60 && validatorRang < 60) {
        return res.status(403).json({ success: false, message: 'Seul un officier ou administratif peut valider le rapport d\'un sous-officier' })
      }
    }

    // Get validator's saved signature/stamp or use the provided ones
    const { signature_data, stamp_data } = req.body
    let sigData = signature_data
    if (!sigData && req.user.effectif_id) {
      const saved = await queryOne('SELECT signature_data FROM signatures_effectifs WHERE effectif_id = ?', [req.user.effectif_id])
      if (saved) sigData = saved.signature_data
    }

    const validatorName = `${req.user.prenom || ''} ${req.user.nom || req.user.username}`.trim()
    // Determine validator label: "Bataillon Administratif" for recenseurs, grade for others
    const validatorLabel = isAdministratif && !req.user.isOfficier
      ? `Bataillon Administratif ${validatorName}`
      : validatorName

    // Validate AND auto-publish — validator signature goes in valide_* fields ONLY
    // Do NOT overwrite the author's signature_image/signature_nom/signature_grade
    await pool.execute(
      `UPDATE rapports SET valide = 1, published = 1, valide_par = ?, valide_par_nom = ?, valide_signature = ?, valide_stamp = ?, valide_at = NOW()
       WHERE id = ?`,
      [req.user.id, validatorLabel, sigData || null, stamp_data || null, req.params.id]
    )

    // Save signature if new
    if (sigData && req.user.effectif_id) {
      await query(
        `INSERT INTO signatures_effectifs (effectif_id, signature_data) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE signature_data = VALUES(signature_data)`,
        [req.user.effectif_id, sigData]
      ).catch(() => {})
    }

    logActivity(req, 'validate_rapport', 'rapport', req.params.id, `Validé par ${validatorLabel}`)
    res.json({ success: true, validatorLabel })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// PUT /api/rapports/:id/forward — Send validated rapport to an officer for approval
router.put('/:id/forward', auth, async (req, res) => {
  try {
    const rapport = await queryOne('SELECT * FROM rapports WHERE id = ?', [req.params.id])
    if (!rapport) return res.status(404).json({ success: false, message: 'Rapport introuvable' })
    if (!rapport.valide) return res.status(400).json({ success: false, message: 'Le rapport doit d\'abord être validé' })

    const { officier_effectif_id } = req.body
    if (!officier_effectif_id) return res.status(400).json({ success: false, message: 'Officier requis' })

    const officier = await queryOne(
      `SELECT e.id, e.prenom, e.nom, u.id as user_id FROM effectifs e LEFT JOIN users u ON u.effectif_id = e.id WHERE e.id = ?`,
      [officier_effectif_id]
    )
    if (!officier) return res.status(404).json({ success: false, message: 'Officier introuvable' })

    const senderName = `${req.user.prenom || ''} ${req.user.nom || req.user.username}`.trim()
    const officierNom = `${officier.prenom} ${officier.nom}`

    // Send telegramme
    const nextNum = await queryOne('SELECT COALESCE(MAX(numero),0)+1 AS n FROM telegrammes')
    await pool.execute(
      `INSERT INTO telegrammes (numero, expediteur_id, expediteur_nom, destinataire_id, destinataire_nom, objet, contenu, priorite, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Urgent', ?)`,
      [
        nextNum.n,
        req.user.effectif_id || null,
        senderName,
        officier.id,
        officierNom,
        `📋 Rapport à approuver — "${rapport.titre}"`,
        `Le rapport "${rapport.titre}" (N°${req.params.id}) a été vérifié et validé.\n\nVotre approbation est demandée.\n\nLien : ${req.headers.origin || ''}/rapports/${req.params.id}`,
        req.user.id
      ]
    )

    // Notification
    if (officier.user_id) {
      await pool.execute(
        `INSERT INTO notifications (user_id, type, titre, message, lien, created_at)
         VALUES (?, 'rapport', '📋 Rapport à approuver', ?, ?, NOW())`,
        [officier.user_id, `"${rapport.titre}" — envoyé par ${senderName}`, `/rapports/${req.params.id}`]
      ).catch(() => {})
    }

    logActivity(req, 'forward_rapport', 'rapport', req.params.id, `Envoyé à ${officierNom} par ${senderName}`)
    res.json({ success: true })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// PUT /api/rapports/:id/approve — Officer approves a validated rapport (fond)
router.put('/:id/approve', auth, async (req, res) => {
  try {
    if (!req.user.isOfficier && !req.user.isEtatMajor) {
      return res.status(403).json({ success: false, message: 'Seul un officier peut approuver un rapport' })
    }
    const rapport = await queryOne('SELECT * FROM rapports WHERE id = ?', [req.params.id])
    if (!rapport) return res.status(404).json({ success: false, message: 'Rapport introuvable' })
    if (!rapport.valide) return res.status(400).json({ success: false, message: 'Le rapport doit d\'abord être validé par un administratif' })
    if (rapport.approuve_par) return res.status(400).json({ success: false, message: 'Rapport déjà approuvé' })

    const { signature_data, stamp_data, commentaire } = req.body
    let sigData = signature_data
    if (!sigData && req.user.effectif_id) {
      const saved = await queryOne('SELECT signature_data FROM signatures_effectifs WHERE effectif_id = ?', [req.user.effectif_id])
      if (saved) sigData = saved.signature_data
    }

    const approverName = `${req.user.prenom || ''} ${req.user.nom || req.user.username}`.trim()
    const gradeNom = req.user.grade_nom || ''
    const approverLabel = gradeNom ? `${gradeNom} ${approverName}` : approverName

    await pool.execute(
      `UPDATE rapports SET approuve_par = ?, approuve_par_nom = ?, approuve_signature = ?, approuve_stamp = ?, approuve_at = NOW(), approuve_commentaire = ?
       WHERE id = ?`,
      [req.user.id, approverLabel, sigData || null, stamp_data || null, commentaire || null, req.params.id]
    )

    // Save signature
    if (sigData && req.user.effectif_id) {
      await query(
        `INSERT INTO signatures_effectifs (effectif_id, signature_data) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE signature_data = VALUES(signature_data)`,
        [req.user.effectif_id, sigData]
      ).catch(() => {})
    }

    logActivity(req, 'approve_rapport', 'rapport', req.params.id, `Approuvé par ${approverLabel}`)
    res.json({ success: true, approverLabel })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// GET /api/rapports/templates/list — rapport templates
// PUT /api/rapports/:id/sign — Sign a rapport (author signature)
router.put('/:id/sign', auth, async (req, res) => {
  try {
    const { signature_data } = req.body
    if (!signature_data) return res.status(400).json({ success: false, message: 'Signature requise' })

    const rapport = await queryOne('SELECT id, auteur_id FROM rapports WHERE id = ?', [req.params.id])
    if (!rapport) return res.status(404).json({ success: false, message: 'Rapport introuvable' })

    // Only author, admin, or recenseur (administratif) can sign the author slot
    if (rapport.auteur_id !== req.user.id && !req.user.isAdmin && !req.user.isRecenseur) {
      return res.status(403).json({ success: false, message: 'Seul l\'auteur peut signer ce rapport' })
    }

    // Get signer info
    let sigNom = req.user.username, sigGrade = null
    if (req.user.effectif_id) {
      const eff = await queryOne('SELECT prenom, nom, grade_id FROM effectifs e WHERE e.id = ?', [req.user.effectif_id])
      if (eff) {
        sigNom = `${eff.prenom} ${eff.nom}`
        const g = await queryOne('SELECT nom_complet FROM grades WHERE id = ?', [eff.grade_id])
        if (g) sigGrade = g.nom_complet
      }
    }

    await pool.execute('UPDATE rapports SET signature_image = ?, signature_nom = ?, signature_grade = ? WHERE id = ?',
      [signature_data, sigNom, sigGrade, req.params.id])

    // Save personal signature
    if (req.user.effectif_id) {
      await pool.execute(
        'INSERT INTO signatures_effectifs (effectif_id, signature_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE signature_data = ?',
        [req.user.effectif_id, signature_data, signature_data]
      ).catch(() => {})
    }

    res.json({ success: true })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

module.exports = router
