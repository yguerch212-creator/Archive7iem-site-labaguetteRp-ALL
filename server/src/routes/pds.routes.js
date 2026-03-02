const { logActivity } = require('../utils/logger')
const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// Semaine RP: vendredi → jeudi (deadline vendredi 20h, samedi = cérémonie)
// On utilise les numéros de semaine ISO mais la semaine RP commence le vendredi.
// Si on est vendredi après 20h ou samedi-jeudi, on est dans la semaine ISO suivante côté RP.
function getCurrentWeek() {
  const now = new Date()
  const utcDay = now.getUTCDay() // 0=dim, 1=lun, ..., 5=ven, 6=sam
  const utcHour = now.getUTCHours()
  
  // Find the Friday that started the current RP week (Fri 20h → Fri 20h)
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  
  if (utcDay === 5) {
    // Friday: if before 20h UTC, still previous RP week
    if (utcHour < 20) d.setUTCDate(d.getUTCDate() - 7)
    // else: this Friday is the start
  } else if (utcDay === 6) {
    // Saturday: Friday was yesterday
    d.setUTCDate(d.getUTCDate() - 1)
  } else {
    // Sun(0), Mon(1), Tue(2), Wed(3), Thu(4): go back to last Friday
    const daysBack = (utcDay + 2) % 7 // Sun→2, Mon→3, Tue→4, Wed→5, Thu→6
    d.setUTCDate(d.getUTCDate() - daysBack)
  }
  
  // d is now the Friday that started this RP week. Compute its ISO week.
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
             p.total_heures, p.valide
      FROM effectifs e
      INNER JOIN pds_semaines p ON p.effectif_id = e.id AND p.semaine = ?
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      WHERE e.actif = 'Actif'
      ORDER BY u.code, COALESCE(g.rang, 0) DESC, e.nom
    `, [semaine])

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

    // Lock: only current RP week is editable (unless admin)
    const currentWeek = getCurrentWeek()
    if (!req.user.isAdmin && semaine !== currentWeek) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez remplir que la semaine en cours' })
    }

    // Compute total hours from creneaux
    const totalHeures = 
      parseCreneaux(lundi) + parseCreneaux(mardi) + parseCreneaux(mercredi) +
      parseCreneaux(jeudi) + parseCreneaux(vendredi) + parseCreneaux(vendredi_fin) + parseCreneaux(samedi) + parseCreneaux(dimanche)

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
      jeudi || null, vendredi || null, vendredi_fin || null, samedi || null, dimanche || null,
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
      SELECT e.id AS effectif_id, e.nom, e.prenom, e.fonction,
             g.nom_complet AS grade_nom, g.rang AS grade_rang,
             u.nom AS unite_nom, u.code AS unite_code,
             p.id AS pds_id, p.lundi, p.mardi, p.mercredi, p.jeudi, p.vendredi, p.vendredi_fin, p.samedi, p.dimanche,
             p.total_heures, p.valide
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
      if (!includeHDR && rang < 35 && !r.pds_id) return false // HDR without PDS excluded by default
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
             t.username AS traite_par_nom
      FROM permissions_absence pa
      JOIN effectifs e ON e.id = pa.effectif_id
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      LEFT JOIN users t ON t.id = pa.traite_par
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

    const [result] = await pool.execute(
      'INSERT INTO permissions_absence (effectif_id, date_debut, date_fin, raison) VALUES (?, ?, ?, ?)',
      [effectif_id, date_debut, date_fin, raison]
    )
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
    res.json({ success: true })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// DELETE /api/pds/:id (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: 'Admin requis' })
    await pool.execute('DELETE FROM pds_semaines WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

module.exports = router
