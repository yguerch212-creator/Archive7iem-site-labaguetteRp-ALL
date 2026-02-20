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
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
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
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
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
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/front/events/:id
router.delete('/events/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isEtatMajor && !req.user.isRecenseur)
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    await pool.execute('DELETE FROM situation_front_events WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
