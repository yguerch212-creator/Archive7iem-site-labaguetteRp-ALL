const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const feldgendarmerie = require('../middleware/feldgendarmerie')

// GET /api/interdits — Liste tous les interdits (actifs par défaut)
router.get('/', auth, async (req, res) => {
  try {
    const showAll = req.query.all === '1'
    const rows = await query(`
      SELECT i.*, 
             e.nom AS effectif_nom, e.prenom AS effectif_prenom,
             g.nom_complet AS effectif_grade, u.code AS effectif_unite_code, u.nom AS effectif_unite_nom,
             ord.username AS ordonne_par_nom,
             lev.username AS leve_par_nom
      FROM interdits_front i
      JOIN effectifs e ON e.id = i.effectif_id
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      JOIN users ord ON ord.id = i.ordonne_par
      LEFT JOIN users lev ON lev.id = i.leve_par
      ${showAll ? '' : 'WHERE i.actif = 1'}
      ORDER BY i.created_at DESC
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/interdits/effectif/:effectif_id — Historique d'un effectif
router.get('/effectif/:effectif_id', auth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT i.*, ord.username AS ordonne_par_nom, lev.username AS leve_par_nom
      FROM interdits_front i
      JOIN users ord ON ord.id = i.ordonne_par
      LEFT JOIN users lev ON lev.id = i.leve_par
      WHERE i.effectif_id = ?
      ORDER BY i.created_at DESC
    `, [req.params.effectif_id])
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/interdits — Créer un interdit de front (feldgendarmerie/officier/admin)
router.post('/', auth, feldgendarmerie, async (req, res) => {
  try {
    const { effectif_id, motif, type, date_debut, date_fin, notes } = req.body
    if (!effectif_id || !motif) {
      return res.status(400).json({ success: false, message: 'effectif_id et motif requis' })
    }

    const [result] = await pool.execute(
      `INSERT INTO interdits_front (effectif_id, motif, type, date_debut, date_fin, ordonne_par, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [effectif_id, motif, type || 'Disciplinaire', date_debut || new Date().toISOString().slice(0, 10), date_fin || null, req.user.id, notes || null]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/interdits/:id/lever — Lever un interdit
router.put('/:id/lever', auth, feldgendarmerie, async (req, res) => {
  try {
    await pool.execute(
      `UPDATE interdits_front SET actif = 0, leve_par = ?, date_levee = NOW(), notes = CONCAT(COALESCE(notes,''), '\n--- Levé: ', ?)
       WHERE id = ? AND actif = 1`,
      [req.user.id, req.body.motif_levee || 'Levé', req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/interdits/:id (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: 'Admin uniquement' })
    await pool.execute('DELETE FROM interdits_front WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
