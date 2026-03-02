const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// GET /api/front/cartes — All maps with stats + VPs
router.get('/cartes', optionalAuth, async (req, res) => {
  try {
    const cartes = await query('SELECT * FROM situation_front_cartes ORDER BY ordre')
    for (const c of cartes) {
      c.vps = await query('SELECT * FROM situation_front_vp WHERE carte_id = ? ORDER BY numero', [c.id])
      // Last VP events for current VP display
      c.lastEvents = await query(`
        SELECT e.*, v.numero as vp_numero FROM situation_front_events e 
        LEFT JOIN situation_front_vp v ON v.id = e.vp_id
        WHERE e.carte_id = ? AND e.type_event IN ('prise','perte','debut','fin')
        ORDER BY e.date_irl ASC
      `, [c.id])
      c.stats = await queryOne(`
        SELECT 
          SUM(CASE WHEN type_event='attaque' AND camp_vainqueur='allemand' THEN 1 ELSE 0 END) as att_all,
          SUM(CASE WHEN type_event='attaque' AND camp_vainqueur='us' THEN 1 ELSE 0 END) as att_us,
          SUM(CASE WHEN type_event='defense' AND camp_vainqueur='allemand' THEN 1 ELSE 0 END) as def_all,
          SUM(CASE WHEN type_event='defense' AND camp_vainqueur='us' THEN 1 ELSE 0 END) as def_us,
          SUM(CASE WHEN type_event='prise' THEN 1 ELSE 0 END) as prises,
          SUM(CASE WHEN type_event='perte' THEN 1 ELSE 0 END) as pertes
        FROM situation_front_events WHERE carte_id = ?
      `, [c.id])
    }
    res.json({ success: true, data: cartes })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// GET /api/front/cartes/:id/events — History for a map
router.get('/cartes/:id/events', optionalAuth, async (req, res) => {
  try {
    const events = await query(`
      SELECT e.*, v.nom as vp_nom, v.numero as vp_numero,
        CONCAT(ef.prenom,' ',ef.nom) as rapporte_par_nom 
      FROM situation_front_events e 
      LEFT JOIN situation_front_vp v ON v.id = e.vp_id
      LEFT JOIN effectifs ef ON ef.id = e.rapporte_par
      WHERE e.carte_id = ? ORDER BY e.date_irl DESC
    `, [req.params.id])
    res.json({ success: true, data: events })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// POST /api/front/cartes/:id/events — Add event
router.post('/cartes/:id/events', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isSousOfficier && !req.user.isEtatMajor)
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    const { type_event, resultat, camp_vainqueur, vp_id, heure, note } = req.body
    if (!type_event) return res.status(400).json({ success: false, message: 'Type requis' })
    const [result] = await pool.execute(
      'INSERT INTO situation_front_events (carte_id, type_event, resultat, camp_vainqueur, vp_id, heure, note, rapporte_par) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.params.id, type_event, resultat || 'vp', camp_vainqueur || '', vp_id || null, heure || null, note || null, req.user.effectif_id || null]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// DELETE /api/front/events/:id
router.delete('/events/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isEtatMajor && !req.user.isRecenseur)
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    await pool.execute('DELETE FROM situation_front_events WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// GET /api/front/rapport — Weekly/daily front report
router.get('/rapport', optionalAuth, async (req, res) => {
  try {
    const { periode, date_debut } = req.query
    let where = ''
    const params = []
    const refDate = date_debut || new Date().toISOString().slice(0, 10)
    if (periode === 'jour') {
      where = 'AND DATE(e.date_irl) = ?'
      params.push(refDate)
    } else if (periode === 'semaine') {
      // RP week: Friday 20h → Friday 20h
      // Find the Friday before or on refDate
      const ref = new Date(refDate + 'T12:00:00')
      const day = ref.getDay() // 0=Sun 5=Fri
      const diff = day >= 5 ? day - 5 : day + 2
      const fri = new Date(ref); fri.setDate(ref.getDate() - diff)
      const friEnd = new Date(fri); friEnd.setDate(fri.getDate() + 7)
      where = 'AND DATE(e.date_irl) >= ? AND DATE(e.date_irl) < ?'
      params.push(fri.toISOString().slice(0, 10), friEnd.toISOString().slice(0, 10))
    }

    const cartes = await query('SELECT * FROM situation_front_cartes ORDER BY ordre')
    const rapport = []
    for (const c of cartes) {
      const events = await query(`
        SELECT e.*, v.nom as vp_nom, v.numero as vp_numero
        FROM situation_front_events e 
        LEFT JOIN situation_front_vp v ON v.id = e.vp_id
        WHERE e.carte_id = ? ${where}
        ORDER BY e.date_irl DESC
      `, [c.id, ...params])

      const att_all = events.filter(e => e.type_event === 'attaque' && e.camp_vainqueur === 'allemand').length
      const att_us = events.filter(e => e.type_event === 'attaque' && e.camp_vainqueur === 'us').length
      const def_all = events.filter(e => e.type_event === 'defense' && e.camp_vainqueur === 'allemand').length
      const def_us = events.filter(e => e.type_event === 'defense' && e.camp_vainqueur === 'us').length
      const stats = {
        att_all, att_us, def_all, def_us,
        nb_attaques: att_all + att_us,
        nb_defenses: def_all + def_us,
        prises: events.filter(e => e.type_event === 'prise').length,
        pertes: events.filter(e => e.type_event === 'perte').length
      }
      rapport.push({ carte: c, events, stats })
    }
    res.json({ success: true, data: rapport })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// GET /api/front/events — All events (for commandement charts)
router.get('/events', optionalAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT e.*, c.nom AS carte_nom
      FROM situation_front_events e
      LEFT JOIN situation_front_cartes c ON c.id = e.carte_id
      ORDER BY e.date_irl DESC, e.heure DESC
      LIMIT 500
    `)
    res.json({ success: true, data: rows })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

module.exports = router
