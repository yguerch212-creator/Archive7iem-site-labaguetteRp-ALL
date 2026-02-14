const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')

// Middleware: officier/admin only
function officier(req, res, next) {
  if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isRecenseur) return res.status(403).json({ success: false, message: 'Réservé aux officiers' })
  next()
}

// GET /api/commandement/dashboard — Officer dashboard data
router.get('/dashboard', auth, officier, async (req, res) => {
  try {
    const effectifs = await queryOne('SELECT COUNT(*) as c FROM effectifs')
    const interditsActifs = await queryOne('SELECT COUNT(*) as c FROM interdits_front WHERE actif = 1')
    const rapportsNonValides = await queryOne('SELECT COUNT(*) as c FROM rapports WHERE valide = 0 AND published = 1')
    const rapportsSemaine = await queryOne("SELECT COUNT(*) as c FROM rapports WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
    
    // PDS compliance current week
    const pdsTotal = await queryOne("SELECT COUNT(DISTINCT effectif_id) as c FROM pds_semaines WHERE semaine = (SELECT MAX(semaine) FROM pds_semaines)")
    const pdsValides = await queryOne("SELECT COUNT(DISTINCT effectif_id) as c FROM pds_semaines WHERE semaine = (SELECT MAX(semaine) FROM pds_semaines) AND total_heures >= 6")
    
    // Effectifs par statut
    const parStatut = {
      actifs: (effectifs?.c || 0) - (interditsActifs?.c || 0),
      interdits: interditsActifs?.c || 0,
    }

    // Recent activity
    const activiteRecente = await query(`
      (SELECT 'rapport' as type, CAST(id AS CHAR) as item_id, titre as label, auteur_nom as auteur, created_at FROM rapports ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'telegramme', CAST(id AS CHAR), CONCAT(numero,' — ',objet), expediteur_nom, created_at FROM telegrammes ORDER BY created_at DESC LIMIT 5)
      ORDER BY created_at DESC LIMIT 10
    `)

    // Ordres non-lus
    const ordresRecents = await query('SELECT id, numero, titre, type, created_at FROM ordres ORDER BY created_at DESC LIMIT 5')

    res.json({
      success: true,
      effectifs: effectifs?.c || 0,
      parStatut,
      rapportsNonValides: rapportsNonValides?.c || 0,
      rapportsSemaine: rapportsSemaine?.c || 0,
      pds: { total: pdsTotal?.c || 0, valides: pdsValides?.c || 0 },
      activiteRecente,
      ordresRecents,
    })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/commandement/notes
router.get('/notes', auth, officier, async (req, res) => {
  try {
    const rows = await query(`
      SELECT n.*, u.username AS auteur_username
      FROM notes_commandement n LEFT JOIN users u ON u.id = n.auteur_id
      WHERE n.prive = 0 OR n.auteur_id = ? OR n.destinataire_id = ?
      ORDER BY n.created_at DESC LIMIT 50
    `, [req.user.id, req.user.id])
    res.json({ success: true, data: rows })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/commandement/notes
router.post('/notes', auth, officier, async (req, res) => {
  try {
    const { contenu, destinataire_id, prive } = req.body
    const nom = `${req.user.prenom || ''} ${req.user.nom || req.user.username}`.trim()
    const [result] = await pool.execute(
      'INSERT INTO notes_commandement (contenu, auteur_id, auteur_nom, destinataire_id, prive) VALUES (?,?,?,?,?)',
      [contenu, req.user.id, nom, destinataire_id || null, prive ? 1 : 0]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/commandement/notes/:id
router.delete('/notes/:id', auth, officier, async (req, res) => {
  try {
    const note = await queryOne('SELECT * FROM notes_commandement WHERE id = ?', [req.params.id])
    if (!note) return res.status(404).json({ success: false, message: 'Introuvable' })
    if (!req.user.isAdmin && note.auteur_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' })
    await pool.execute('DELETE FROM notes_commandement WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/commandement/etat — État PDS + rapports par effectif cette semaine
router.get('/etat', auth, officier, async (req, res) => {
  try {
    let semaine = req.query.semaine
    let weekStart

    if (semaine) {
      // Use provided week
      const d = new Date(semaine + 'T20:00:00Z')
      weekStart = d.toISOString().slice(0, 19).replace('T', ' ')
    } else {
      // Current RP week (Friday 20h → Friday 20h)
      const now = new Date()
      const day = now.getUTCDay()
      const hour = now.getUTCHours()
      let daysBack = (day - 5 + 7) % 7
      if (daysBack === 0 && hour < 20) daysBack = 7
      const friday = new Date(now)
      friday.setUTCDate(friday.getUTCDate() - daysBack)
      friday.setUTCHours(20, 0, 0, 0)
      weekStart = friday.toISOString().slice(0, 19).replace('T', ' ')
      semaine = friday.toISOString().slice(0, 10)
    }

    // Available weeks
    const weeks = await query("SELECT DISTINCT semaine FROM pds_semaines ORDER BY semaine DESC LIMIT 20")

    const rows = await query(`
      SELECT e.id, e.prenom, e.nom, e.en_reserve,
             g.nom_complet AS grade_nom, g.rang AS grade_rang,
             u.code AS unite_code, u.nom AS unite_nom,
             (SELECT COUNT(*) FROM pds_semaines p WHERE p.effectif_id = e.id AND p.semaine = ?) AS pds_fait,
             (SELECT SUM(p.total_heures) FROM pds_semaines p WHERE p.effectif_id = e.id AND p.semaine = ?) AS pds_heures,
             (SELECT COUNT(*) FROM rapports r WHERE r.auteur_id = e.id AND r.created_at >= ?) AS rapports_semaine
      FROM effectifs e
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      WHERE e.en_reserve = 0
      ORDER BY u.code, g.rang DESC, e.nom
    `, [semaine, semaine, weekStart])

    res.json({ success: true, data: rows, semaine, weekStart, weeks: weeks.map(w => w.semaine) })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
