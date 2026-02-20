const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// GET /api/front/cartes — Liste des cartes avec stats
router.get('/cartes', optionalAuth, async (req, res) => {
  try {
    const cartes = await query('SELECT * FROM situation_front_cartes ORDER BY ordre')
    // Pour chaque carte, compter les events
    for (const c of cartes) {
      const stats = await queryOne(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN type_event='attaque' AND camp_vainqueur='allemand' THEN 1 ELSE 0 END) as att_win_de,
          SUM(CASE WHEN type_event='attaque' AND camp_vainqueur='us' THEN 1 ELSE 0 END) as att_win_us,
          SUM(CASE WHEN type_event='defense' AND camp_vainqueur='allemand' THEN 1 ELSE 0 END) as def_win_de,
          SUM(CASE WHEN type_event='defense' AND camp_vainqueur='us' THEN 1 ELSE 0 END) as def_win_us,
          SUM(CASE WHEN resultat='lose' AND camp_vainqueur='allemand' THEN 1 ELSE 0 END) as defeat_de,
          SUM(CASE WHEN resultat='lose' AND camp_vainqueur='us' THEN 1 ELSE 0 END) as defeat_us
        FROM situation_front_events WHERE carte_id = ?
      `, [c.id])
      c.stats = stats
      // Dernier event
      c.dernierEvent = await queryOne(
        'SELECT * FROM situation_front_events WHERE carte_id = ? ORDER BY date_irl DESC LIMIT 1', [c.id]
      )
    }
    res.json({ success: true, data: cartes })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/front/cartes/:id/events — Historique d'une carte
router.get('/cartes/:id/events', optionalAuth, async (req, res) => {
  try {
    const events = await query(`
      SELECT e.*, CONCAT(ef.prenom,' ',ef.nom) as rapporte_par_nom 
      FROM situation_front_events e 
      LEFT JOIN effectifs ef ON ef.id = e.rapporte_par
      WHERE e.carte_id = ? 
      ORDER BY e.date_irl DESC
    `, [req.params.id])
    res.json({ success: true, data: events })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/front/cartes/:id/events — Ajouter un événement (officier/admin/SO)
router.post('/cartes/:id/events', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isSousOfficier && !req.user.isEtatMajor)
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    const { type_event, resultat, camp_vainqueur, date_rp, note } = req.body
    if (!type_event || !resultat || !camp_vainqueur)
      return res.status(400).json({ success: false, message: 'Champs requis manquants' })
    const [result] = await pool.execute(
      'INSERT INTO situation_front_events (carte_id, type_event, resultat, camp_vainqueur, date_rp, note, rapporte_par) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.params.id, type_event, resultat, camp_vainqueur, date_rp || null, note || null, req.user.effectif_id || null]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/front/events/:id — Supprimer un événement (admin/officier)
router.delete('/events/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isEtatMajor)
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    await pool.execute('DELETE FROM situation_front_events WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/front/cartes — Ajouter une carte (admin)
router.post('/cartes', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isEtatMajor)
      return res.status(403).json({ success: false, message: 'Admin only' })
    const { nom, description } = req.body
    const maxOrdre = await queryOne('SELECT COALESCE(MAX(ordre),0)+1 as next FROM situation_front_cartes')
    const [result] = await pool.execute(
      'INSERT INTO situation_front_cartes (nom, description, ordre) VALUES (?, ?, ?)',
      [nom, description || null, maxOrdre.next]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/front/cartes/:id — Supprimer une carte (admin)
router.delete('/cartes/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isEtatMajor)
      return res.status(403).json({ success: false, message: 'Admin only' })
    await pool.execute('DELETE FROM situation_front_cartes WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
