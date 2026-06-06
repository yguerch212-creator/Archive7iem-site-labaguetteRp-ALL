const { logActivity } = require('../utils/logger')
const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')
const { loadPdsConfig, annotate } = require('../utils/pds')

// Semaine PDS : samedi 00h00 -> vendredi 23h59 (PAS de bascule a 20h).
// Le vendredi reste dans la semaine en cours jusqu'a 23h59 ; le samedi ouvre la nouvelle.
// Label = numero de semaine ISO du vendredi qui precede le samedi de debut (coherent avec les donnees stockees).
function getCurrentWeek() {
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const utcDay = d.getUTCDay() // 0=dim, ..., 5=ven, 6=sam
  // Reculer jusqu'au samedi qui debute la semaine PDS courante
  const daysSinceSat = (utcDay + 1) % 7 // sam->0, dim->1, lun->2, ..., ven->6
  d.setUTCDate(d.getUTCDate() - daysSinceSat) // samedi de debut
  d.setUTCDate(d.getUTCDate() - 1)            // vendredi precedent = ancrage du label (inchange vs avant)

  // Compute its ISO week.
  const ref = new Date(d)
  const dayNum = ref.getUTCDay() || 7
  ref.setUTCDate(ref.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(ref.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((ref - yearStart) / 86400000) + 1) / 7)
  return `${ref.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

// Helper: parse time slots and compute hours
// Input: "17h30-17h50, 19h40-22h" → returns decimal hours
function parseCreneaux(text) {
  if (!text || text.trim().toUpperCase() === 'X' || text.trim() === '') return 0
  let total = 0
  const normalized = text.replace(/[Hh]/g, 'h').replace(/\s*-\s*/g, '-')
  const slots = normalized.split(',').map(s => s.trim()).filter(Boolean)
  for (const slot of slots) {
    const match = slot.match(/(\d{1,2})(?:h(\d{0,2}))?\s*-\s*(\d{1,2})(?:h(\d{0,2}))?/)
    if (match) {
      const start = parseInt(match[1]) + (parseInt(match[2] || 0) / 60)
      const end = parseInt(match[3]) + (parseInt(match[4] || 0) / 60)
      if (end > start) total += (end - start)
    }
  }
  return Math.round(total * 100) / 100
}

// GET /api/pds?semaine=2026-W07 — All PDS for a week (everyone can see)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const semaine = req.query.semaine || getCurrentWeek()

    const rows = await query(`
      SELECT e.id AS effectif_id, e.nom, e.prenom, e.fonction, e.categorie,
             g.nom_complet AS grade_nom, g.rang AS grade_rang,
             u.nom AS unite_nom, u.code AS unite_code, u.id AS unite_id,
             p.id AS pds_id, p.lundi, p.mardi, p.mercredi, p.jeudi, p.vendredi, p.vendredi_fin, p.samedi, p.dimanche,
             p.total_heures
      FROM effectifs e
      INNER JOIN pds_semaines p ON p.effectif_id = e.id AND p.semaine = ?
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      WHERE e.actif = 'Actif'
      ORDER BY u.code, COALESCE(g.rang, 0) DESC, e.nom
    `, [semaine])

    // Seuil de validation reel par regiment/categorie (pds_config + defauts), pas un 6h fige.
    annotate(rows, await loadPdsConfig(query))
    const saisis = rows.length
    const valides = rows.filter(r => r.valide).length

    // Total active effectifs (for context)
    const totalRow = await queryOne('SELECT COUNT(*) AS cnt FROM effectifs WHERE actif = "Actif"')
    const totalEffectifs = totalRow?.cnt || 0

    res.json({
      success: true,
      data: rows,
      semaine,
      semaineActuelle: getCurrentWeek(),
      stats: { total: totalEffectifs, saisis, valides }
    })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// GET /api/pds/mine?semaine=2026-W07 — My own PDS
router.get('/mine', auth, async (req, res) => {
  try {
    if (!req.user.effectif_id) {
      return res.json({ success: true, data: null, message: 'Aucun effectif lié à ce compte' })
    }
    const semaine = req.query.semaine || getCurrentWeek()
    const row = await queryOne(`
      SELECT p.*, e.nom, e.prenom, g.nom_complet AS grade_nom, u.nom AS unite_nom, u.code AS unite_code
      FROM effectifs e
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      LEFT JOIN pds_semaines p ON p.effectif_id = e.id AND p.semaine = ?
      WHERE e.id = ?
    `, [semaine, req.user.effectif_id])
    res.json({ success: true, data: row, semaine, semaineActuelle: getCurrentWeek() })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// PUT /api/pds/saisie — Update own PDS (self-service)
router.put('/saisie', auth, async (req, res) => {
  try {
    const { effectif_id, semaine, lundi, mardi, mercredi, jeudi, vendredi, vendredi_fin, samedi, dimanche } = req.body
    
    if (!effectif_id || !semaine) {
      return res.status(400).json({ success: false, message: 'effectif_id et semaine requis' })
    }

    // Only self can edit, unless admin/recenseur
    const isPrivileged = req.user.isAdmin || req.user.isRecenseur
    if (!isPrivileged && req.user.effectif_id !== effectif_id) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez modifier que votre propre PDS' })
    }

    // Lock: only current RP week is editable (unless admin/administratif)
    const currentWeek = getCurrentWeek()
    const canEditPast = req.user.isAdmin || req.user.isRecenseur
    if (!canEditPast && semaine !== currentWeek) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez remplir que la semaine en cours' })
    }

    // Log retroactive edits by administratifs
    if (canEditPast && semaine !== currentWeek && req.user.effectif_id !== effectif_id) {
      const target = await queryOne('SELECT prenom, nom FROM effectifs WHERE id = ?', [effectif_id])
      const targetName = target ? `${target.prenom} ${target.nom}` : `#${effectif_id}`
      logActivity(req, 'admin_retro_pds', 'pds', effectif_id, `PDS modifie retroactivement pour ${targetName} (semaine ${semaine})`)
    }

    // Compute total hours from creneaux
    const totalHeures = 
      parseCreneaux(lundi) + parseCreneaux(mardi) + parseCreneaux(mercredi) +
      parseCreneaux(jeudi) + parseCreneaux(vendredi_fin) + parseCreneaux(samedi) + parseCreneaux(dimanche)

    await pool.execute(`
      INSERT INTO pds_semaines (effectif_id, semaine, lundi, mardi, mercredi, jeudi, vendredi, vendredi_fin, samedi, dimanche, total_heures)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        lundi = VALUES(lundi), mardi = VALUES(mardi), mercredi = VALUES(mercredi),
        jeudi = VALUES(jeudi), vendredi = VALUES(vendredi), vendredi_fin = VALUES(vendredi_fin), samedi = VALUES(samedi),
        dimanche = VALUES(dimanche), total_heures = VALUES(total_heures)
    `, [
      effectif_id, semaine,
      lundi || null, mardi || null, mercredi || null,
      jeudi || null, null, vendredi_fin || null, samedi || null, dimanche || null,
      Math.round(totalHeures * 10) / 10
    ])

    res.json({ success: true, total_heures: Math.round(totalHeures * 10) / 10 })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// GET /api/pds/historique/:effectif_id — Historique PDS d'un effectif
router.get('/historique/:effectif_id', auth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT * FROM pds_semaines WHERE effectif_id = ? ORDER BY semaine DESC LIMIT 26
    `, [req.params.effectif_id])
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// GET /api/pds/recap?semaine=2026-W07 — Full recap for officers (all effectifs)
router.get('/recap', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isRecenseur && !req.user.isOfficier) {
      return res.status(403).json({ success: false, message: 'Accès réservé' })
    }
    const semaine = req.query.semaine || getCurrentWeek()

    const allRows = await query(`
      SELECT e.id AS effectif_id, e.nom, e.prenom, e.fonction, e.categorie, e.unite_id,
             g.nom_complet AS grade_nom, g.rang AS grade_rang,
             u.nom AS unite_nom, u.code AS unite_code,
             p.id AS pds_id, p.lundi, p.mardi, p.mercredi, p.jeudi, p.vendredi, p.vendredi_fin, p.samedi, p.dimanche,
             p.total_heures
      FROM effectifs e
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      LEFT JOIN pds_semaines p ON p.effectif_id = e.id AND p.semaine = ?
      WHERE e.actif = 'Actif'
      ORDER BY u.code, COALESCE(g.rang, 0) DESC, e.nom
    `, [semaine])

    // HDR (rang < 35) only appear if they filled PDS — unless includeHDR
    const includeHDR = req.query.includeHDR === '1'
    // Generals (rang > 100) excluded unless they filled PDS
    const rows = allRows.filter(r => {
      const rang = r.grade_rang || 0
      if (rang > 100 && !r.pds_id) return false // generals without PDS excluded
      if (!includeHDR && rang < 30 && !r.pds_id) return false // HDR without PDS excluded by default (SO a partir du rang 30)
      return true
    })

    // Permissions active this week — compute week date range for filtering
    const [yr, wn2] = semaine.split('-W').map(Number)
    const jan4p = new Date(Date.UTC(yr, 0, 4))
    const dowp = jan4p.getUTCDay() || 7
    const monp = new Date(jan4p)
    monp.setUTCDate(jan4p.getUTCDate() - dowp + 1 + (wn2 - 1) * 7)
    const frip = new Date(monp); frip.setUTCDate(monp.getUTCDate() + 4) // Friday
    const fripEnd = new Date(frip); fripEnd.setUTCDate(frip.getUTCDate() + 7) // Next Friday
    const weekStartStr = frip.toISOString().slice(0, 10)
    const weekEndStr = fripEnd.toISOString().slice(0, 10)

    const perms = await query(`
      SELECT pa.*, e.id AS effectif_id, e.prenom, e.nom AS eff_nom, g.nom_complet AS grade_nom
      FROM permissions_absence pa
      JOIN effectifs e ON e.id = pa.effectif_id
      LEFT JOIN grades g ON g.id = e.grade_id
      WHERE pa.statut = 'Approuvee'
        AND pa.date_debut <= ? AND pa.date_fin >= ?
    `, [weekEndStr, weekStartStr])

    // Build a set of effectif_ids with active permissions this week
    const permMap = {}
    perms.forEach(p => { permMap[p.effectif_id] = p.raison || 'En permission' })
    // Attach permission info to rows
    rows.forEach(r => { if (permMap[r.effectif_id]) r.en_permission = permMap[r.effectif_id] })

    // Validation reelle par regiment/categorie (pds_config + defauts), pas un 6h fige.
    annotate(rows, await loadPdsConfig(query))
    const total = rows.length
    const remplis = rows.filter(r => r.pds_id).length
    const valides = rows.filter(r => r.valide).length
    const nonRemplis = rows.filter(r => !r.pds_id)

    res.json({ success: true, data: { rows, perms, semaine, stats: { total, remplis, valides, nonRemplis: nonRemplis.length } } })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// ==========================================
// PERMISSIONS D'ABSENCE
// ==========================================

// GET /api/pds/permissions — Toutes les demandes (admin/recenseur: toutes, sinon: les siennes)
router.get('/permissions', auth, async (req, res) => {
  try {
    const isPrivileged = req.user.isAdmin || req.user.isRecenseur || req.user.isOfficier
    let sql = `
      SELECT pa.*, e.nom, e.prenom, g.nom_complet AS grade_nom, u.code AS unite_code, u.nom AS unite_nom,
             t.username AS traite_par_nom,
             te.prenom AS traite_prenom, te.nom AS traite_nom_eff, tg.nom_complet AS traite_grade
      FROM permissions_absence pa
      JOIN effectifs e ON e.id = pa.effectif_id
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      LEFT JOIN users t ON t.id = pa.traite_par
      LEFT JOIN effectifs te ON te.id = t.effectif_id
      LEFT JOIN grades tg ON tg.id = te.grade_id
    `
    const params = []
    if (!isPrivileged) {
      sql += ' WHERE pa.effectif_id = ?'
      params.push(req.user.effectif_id || 0)
    }
    sql += ' ORDER BY pa.created_at DESC'
    
    const rows = await query(sql, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// POST /api/pds/permissions — Créer une demande (self only)
router.post('/permissions', auth, async (req, res) => {
  try {
    const effectif_id = req.user.effectif_id
    if (!effectif_id) {
      return res.status(400).json({ success: false, message: 'Aucun effectif lié à ce compte' })
    }
    const { date_debut, date_fin, raison } = req.body
    if (!date_debut || !date_fin || !raison) {
      return res.status(400).json({ success: false, message: 'date_debut, date_fin et raison requis' })
    }

    // Anti-doublon : vérifier qu'il n'existe pas déjà une demande identique (mêmes dates, en attente)
    const existing = await queryOne(
      `SELECT id FROM permissions_absence WHERE effectif_id = ? AND date_debut = ? AND date_fin = ? AND statut = 'En attente'`,
      [effectif_id, date_debut, date_fin]
    )
    if (existing) {
      return res.status(409).json({ success: false, message: 'Une demande identique est déjà en attente pour ces dates' })
    }

    const [result] = await pool.execute(
      'INSERT INTO permissions_absence (effectif_id, date_debut, date_fin, raison) VALUES (?, ?, ?, ?)',
      [effectif_id, date_debut, date_fin, raison]
    )

    // Notify Charge-Permission users via telegramme
    try {
      const chargeUsers = await query(`
        SELECT u.id AS user_id, u.effectif_id, CONCAT(COALESCE(e.prenom,''), ' ', COALESCE(e.nom,'')) AS full_name
        FROM users u
        JOIN user_groups ug ON ug.user_id = u.id
        JOIN \`groups\` g ON g.id = ug.group_id
        LEFT JOIN effectifs e ON e.id = u.effectif_id
        WHERE g.name = 'Charge-Permission' AND u.active = 1
      `)

      const demandeur = await queryOne('SELECT prenom, nom FROM effectifs WHERE id = ?', [effectif_id])
      const demandeurNom = demandeur ? `${demandeur.prenom} ${demandeur.nom}` : 'Inconnu'

      for (const cu of chargeUsers) {
        if (cu.effectif_id) {
          const [telResult] = await pool.execute(
            `INSERT INTO telegrammes (numero, expediteur_id, expediteur_nom, destinataire_id, destinataire_nom, objet, contenu, priorite, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'Normal', ?)`,
            [
              `TEL-PERM-${Date.now()}`,
              effectif_id,
              demandeurNom,
              cu.effectif_id,
              cu.full_name.trim(),
              `Demande de permission — ${demandeurNom}`,
              `Une nouvelle demande de permission a été soumise.\n\nDemandeur: ${demandeurNom}\nDu: ${date_debut}\nAu: ${date_fin}\nMotif: ${raison}\n\n→ Accédez à la page des permissions pour traiter cette demande.`,
              req.user.id
            ]
          )
          if (telResult.insertId) {
            await pool.execute(
              'INSERT INTO telegramme_destinataires (telegramme_id, effectif_id) VALUES (?, ?)',
              [telResult.insertId, cu.effectif_id]
            ).catch(() => {})
          }
        }
      }
    } catch (notifErr) {
      console.error('Erreur notification permission:', notifErr.message)
    }

    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// PUT /api/pds/permissions/:id/traiter — Approuver/refuser (officier/admin/recenseur)
router.put('/permissions/:id/traiter', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isRecenseur && !req.user.isOfficier) {
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    }
    const { statut, notes } = req.body // statut: 'Approuvee' | 'Refusee'
    if (!['Approuvee', 'Refusee'].includes(statut)) {
      return res.status(400).json({ success: false, message: 'Statut invalide' })
    }
    await pool.execute(
      'UPDATE permissions_absence SET statut = ?, traite_par = ?, notes_traitement = ? WHERE id = ?',
      [statut, req.user.id, notes || null, req.params.id]
    )
    // Log administratif permission actions
    if (req.user.isRecenseur) {
      const perm = await queryOne('SELECT e.prenom, e.nom FROM permissions_absence pa JOIN effectifs e ON e.id = pa.effectif_id WHERE pa.id = ?', [req.params.id])
      const targetName = perm ? `${perm.prenom} ${perm.nom}` : `#${req.params.id}`
      logActivity(req, 'admin_retro_permission', 'permission', req.params.id, `Permission ${statut} pour ${targetName}`)
    }
    res.json({ success: true })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// DELETE /api/pds/permissions/:id (admin only)
router.delete('/permissions/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: 'Admin requis' })
    const perm = await queryOne('SELECT pa.id, e.prenom, e.nom FROM permissions_absence pa JOIN effectifs e ON e.id = pa.effectif_id WHERE pa.id = ?', [req.params.id])
    if (!perm) return res.status(404).json({ success: false, message: 'Permission introuvable' })
    await pool.execute('DELETE FROM permissions_absence WHERE id = ?', [req.params.id])
    logActivity(req, 'admin_delete_permission', 'permission', req.params.id, `Permission supprimée pour ${perm.prenom} ${perm.nom}`)
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// DELETE /api/pds/:id (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: 'Admin requis' })
    await pool.execute('DELETE FROM pds_semaines WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// GET /api/pds/config — PDS duration config per unite
router.get('/config', optionalAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT pc.unite_id, u.nom AS unite_nom, u.code AS unite_code,
             pc.rang_type, pc.duree_heures, pc.rapports_requis
      FROM pds_config pc
      JOIN unites u ON u.id = pc.unite_id
      ORDER BY u.code, pc.rang_type
    `)
    // Also return default config (for units without custom config)
    res.json({
      success: true,
      data: rows,
      defaults: { hdr: { duree_heures: 4, rapports_requis: 0 }, so: { duree_heures: 6, rapports_requis: 0 }, off: { duree_heures: 0, rapports_requis: 0 } }
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// PUT /api/pds/config (admin only) — Update PDS config for a unite
router.put('/config', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: 'Admin requis' })
    const { unite_id, rang_type, duree_heures, rapports_requis } = req.body
    if (!unite_id || !rang_type) return res.status(400).json({ success: false, message: 'unite_id et rang_type requis' })
    await pool.execute(
      `INSERT INTO pds_config (unite_id, rang_type, duree_heures, rapports_requis)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE duree_heures = VALUES(duree_heures), rapports_requis = VALUES(rapports_requis)`,
      [unite_id, rang_type, duree_heures || 3, rapports_requis || 0]
    )
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

module.exports = router
