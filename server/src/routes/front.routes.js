const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// Maps configuration
const MAPS = {
  'berlin-mur-est': {
    nom: 'Berlin — Mur Est',
    vps: [
      { id: 'feldkommandantur', nom: 'Feldkommandantur' },
      { id: 'marrais', nom: 'Marais' },
      { id: 'mur-est', nom: 'Mur Est' },
      { id: 'village', nom: 'Village' },
      { id: 'poste-radio', nom: 'Poste Radio' }
    ],
    specials: [
      { id: 'defense-base-all', nom: 'Défense de Base Allemande', type: 'defense' },
      { id: 'attaque-base-us', nom: 'Attaque de Base Américaine', type: 'attaque' }
    ]
  },
  'berlin-brandburg': {
    nom: 'Berlin — Porte de Brandebourg',
    vps: [
      { id: 'reichstag', nom: 'Reichstag' },
      { id: 'porte-brandburg', nom: 'Porte de Brandebourg' },
      { id: 'station-train', nom: 'Station de Train' },
      { id: 'cabane', nom: 'Cabane' }
    ],
    specials: []
  },
  'falaise-bunker': {
    nom: 'Falaise — Bunker',
    vps: [
      { id: 'vp1', nom: 'VP1' },
      { id: 'village', nom: 'Village' },
      { id: 'bunker', nom: 'Bunker' },
      { id: 'hameau', nom: 'Hameau' },
      { id: 'vp5', nom: 'VP5' }
    ],
    specials: []
  },
  'falaise-billy': {
    nom: 'Falaise — Maison Billy',
    vps: [
      { id: 'vp1', nom: 'VP1' },
      { id: 'village', nom: 'Village' },
      { id: 'maison-billy', nom: 'Maison Billy' },
      { id: 'hameau', nom: 'Hameau' },
      { id: 'vp5', nom: 'VP5' }
    ],
    specials: []
  }
}

// GET /api/front/maps — List available maps
router.get('/maps', optionalAuth, (req, res) => {
  const maps = Object.entries(MAPS).map(([id, m]) => ({ id, nom: m.nom, vps: m.vps, specials: m.specials || [] }))
  res.json({ success: true, data: maps })
})

// GET /api/front/events — Get front events (filterable by map, date)
router.get('/events', optionalAuth, async (req, res) => {
  try {
    const { map, date } = req.query
    let sql = `SELECT f.*, CONCAT(e.prenom,' ',e.nom) as effectif_nom, g.nom_complet as grade_nom
               FROM front_events f
               LEFT JOIN effectifs e ON e.id = f.effectif_id
               LEFT JOIN grades g ON g.id = e.grade_id
               WHERE 1=1`
    const params = []
    if (map) { sql += ' AND f.map_id = ?'; params.push(map) }
    if (date) { sql += ' AND DATE(f.event_date) = ?'; params.push(date) }
    sql += ' ORDER BY f.event_date DESC, f.event_time DESC LIMIT 500'
    const rows = await query(sql, params)
    res.json({ success: true, data: rows })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/front/events — Create a front event (SO+ only)
router.post('/events', auth, async (req, res) => {
  try {
    // Check rank: sous-officier or higher
    if (!req.user.isOfficier && !req.user.isAdmin && !req.user.isRecenseur && !req.user.isEtatMajor) {
      // Check if user has sous-officier group
      const soGroup = await queryOne("SELECT 1 FROM user_groups ug JOIN `groups` g ON g.id = ug.group_id WHERE ug.user_id = ? AND g.name = 'Sous-officier'", [req.user.id])
      if (!soGroup) return res.status(403).json({ success: false, message: 'Rang sous-officier minimum requis' })
    }

    const { map_id, event_type, vp_id, vp_nom, winner, event_time } = req.body
    if (!map_id || !event_type) return res.status(400).json({ success: false, message: 'map_id et event_type requis' })

    // Auto-fill time if not provided (Europe/Paris)
    const now = new Date()
    const parisTime = event_time || now.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })

    const [result] = await pool.execute(
      `INSERT INTO front_events (map_id, event_type, vp_id, vp_nom, winner, event_time, event_date, effectif_id)
       VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?)`,
      [map_id, event_type, vp_id || null, vp_nom || null, winner || null, parisTime, req.user.effectif_id || null]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/front/stats — Stats for commandement
router.get('/stats', auth, async (req, res) => {
  try {
    const { date, from, to } = req.query
    let dateFilter = ''
    const params = []
    if (date) { dateFilter = 'AND DATE(event_date) = ?'; params.push(date) }
    else if (from && to) { dateFilter = 'AND DATE(event_date) BETWEEN ? AND ?'; params.push(from, to) }

    const prises = await queryOne(`SELECT COUNT(*) as c FROM front_events WHERE event_type = 'prise' ${dateFilter}`, params)
    const pertes = await queryOne(`SELECT COUNT(*) as c FROM front_events WHERE event_type = 'perte' ${dateFilter}`, params)
    const attaques = await queryOne(`SELECT COUNT(*) as c FROM front_events WHERE event_type = 'attaque' ${dateFilter}`, params)
    const defenses = await queryOne(`SELECT COUNT(*) as c FROM front_events WHERE event_type = 'defense' ${dateFilter}`, params)
    const victoiresAll = await queryOne(`SELECT COUNT(*) as c FROM front_events WHERE winner = 'ALL' AND event_type IN ('attaque','defense') ${dateFilter}`, params)
    const victoiresUs = await queryOne(`SELECT COUNT(*) as c FROM front_events WHERE winner = 'US' AND event_type IN ('attaque','defense') ${dateFilter}`, params)

    // Daily breakdown
    const daily = await query(`SELECT DATE(event_date) as jour, event_type, COUNT(*) as c FROM front_events WHERE 1=1 ${dateFilter} GROUP BY jour, event_type ORDER BY jour DESC`, params)

    res.json({ success: true, data: {
      prises: prises.c, pertes: pertes.c,
      attaques: attaques.c, defenses: defenses.c,
      victoires_all: victoiresAll.c, victoires_us: victoiresUs.c,
      daily
    }})
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/front/events/:id — Delete event (admin/officier)
router.delete('/events/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) return res.status(403).json({ success: false, message: 'Non autorisé' })
    await pool.execute('DELETE FROM front_events WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
