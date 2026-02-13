const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const admin = require('../middleware/admin')

// Helper: get current ISO week string (2026-W07)
function getCurrentWeek() {
  const now = new Date()
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

// GET /api/pds?semaine=2026-W07  — Get PDS for a week (all effectifs)
router.get('/', auth, async (req, res) => {
  try {
    const semaine = req.query.semaine || getCurrentWeek()
    
    // Get all active effectifs with their presence data for this week
    const rows = await query(`
      SELECT e.id, e.nom, e.prenom, e.fonction, e.categorie, e.actif,
             g.nom_complet AS grade_nom, g.rang AS grade_rang,
             u.nom AS unite_nom, u.code AS unite_code, u.id AS unite_id,
             p.heures, p.valide, p.rapport_so_fait, p.notes, p.saisie_par,
             sp.username AS saisie_par_nom
      FROM effectifs e
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      LEFT JOIN presences p ON p.effectif_id = e.id AND p.semaine = ?
      LEFT JOIN users sp ON sp.id = p.saisie_par
      WHERE e.actif = 'Actif'
      ORDER BY u.code, COALESCE(g.rang, 0) DESC, e.nom
    `, [semaine])

    // Stats
    const total = rows.length
    const saisis = rows.filter(r => r.heures !== null).length
    const valides = rows.filter(r => r.valide).length
    const soNonRapport = rows.filter(r => r.categorie === 'Sous-officier' && !r.rapport_so_fait).length

    res.json({ 
      success: true, 
      data: rows, 
      semaine, 
      semaineActuelle: getCurrentWeek(),
      stats: { total, saisis, valides, soNonRapport }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/pds/historique/:effectif_id — Historique PDS d'un effectif
router.get('/historique/:effectif_id', auth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT p.*, sp.username AS saisie_par_nom
      FROM presences p
      LEFT JOIN users sp ON sp.id = p.saisie_par
      WHERE p.effectif_id = ?
      ORDER BY p.semaine DESC
      LIMIT 26
    `, [req.params.effectif_id])
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/pds/saisie — Saisie heures (admin/recenseur = tous, sinon = son propre effectif)
router.put('/saisie', auth, async (req, res) => {
  try {
    const { effectif_id, semaine, heures, rapport_so_fait, notes } = req.body
    if (!effectif_id || !semaine) {
      return res.status(400).json({ success: false, message: 'effectif_id et semaine requis' })
    }

    // Check: admin/recenseur can edit anyone, user can only edit own
    const isPrivileged = req.user.isAdmin || req.user.isRecenseur
    if (!isPrivileged && req.user.effectif_id !== effectif_id) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez modifier que vos propres heures' })
    }

    await pool.execute(`
      INSERT INTO presences (effectif_id, semaine, heures, rapport_so_fait, notes, saisie_par)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        heures = VALUES(heures), 
        rapport_so_fait = VALUES(rapport_so_fait),
        notes = VALUES(notes),
        saisie_par = VALUES(saisie_par)
    `, [effectif_id, semaine, heures || 0, rapport_so_fait ? 1 : 0, notes || null, req.user.id])

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/pds/saisie-batch — Saisie en lot
router.put('/saisie-batch', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isRecenseur) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' })
    }

    const { entries, semaine } = req.body // entries: [{effectif_id, heures, rapport_so_fait, notes}]
    if (!entries || !semaine) {
      return res.status(400).json({ success: false, message: 'entries et semaine requis' })
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      for (const e of entries) {
        await conn.execute(`
          INSERT INTO presences (effectif_id, semaine, heures, rapport_so_fait, notes, saisie_par)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            heures = VALUES(heures),
            rapport_so_fait = VALUES(rapport_so_fait),
            notes = VALUES(notes),
            saisie_par = VALUES(saisie_par)
        `, [e.effectif_id, semaine, e.heures || 0, e.rapport_so_fait ? 1 : 0, e.notes || null, req.user.id])
      }
      await conn.commit()
      res.json({ success: true, count: entries.length })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/pds/rapport/:semaine — Rapport hebdo (résumé pour envoi)
router.get('/rapport/:semaine', auth, async (req, res) => {
  try {
    const semaine = req.params.semaine

    const parUnite = await query(`
      SELECT u.code, u.nom AS unite_nom,
        COUNT(e.id) AS total,
        SUM(CASE WHEN p.valide = 1 THEN 1 ELSE 0 END) AS valides,
        SUM(CASE WHEN p.heures IS NOT NULL THEN 1 ELSE 0 END) AS saisis,
        SUM(CASE WHEN e.categorie = 'Sous-officier' AND (p.rapport_so_fait IS NULL OR p.rapport_so_fait = 0) THEN 1 ELSE 0 END) AS so_sans_rapport
      FROM effectifs e
      LEFT JOIN unites u ON u.id = e.unite_id
      LEFT JOIN presences p ON p.effectif_id = e.id AND p.semaine = ?
      WHERE e.actif = 'Actif'
      GROUP BY u.id
      ORDER BY u.code
    `, [semaine])

    const nonValides = await query(`
      SELECT e.nom, e.prenom, g.nom_complet AS grade_nom, u.code AS unite_code,
             COALESCE(p.heures, 0) AS heures
      FROM effectifs e
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      LEFT JOIN presences p ON p.effectif_id = e.id AND p.semaine = ?
      WHERE e.actif = 'Actif' AND (p.valide IS NULL OR p.valide = 0)
      ORDER BY u.code, e.nom
    `, [semaine])

    const soSansRapport = await query(`
      SELECT e.nom, e.prenom, g.nom_complet AS grade_nom, u.code AS unite_code
      FROM effectifs e
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      LEFT JOIN presences p ON p.effectif_id = e.id AND p.semaine = ?
      WHERE e.actif = 'Actif' AND e.categorie = 'Sous-officier'
        AND (p.rapport_so_fait IS NULL OR p.rapport_so_fait = 0)
      ORDER BY u.code, e.nom
    `, [semaine])

    res.json({ success: true, semaine, parUnite, nonValides, soSansRapport })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
