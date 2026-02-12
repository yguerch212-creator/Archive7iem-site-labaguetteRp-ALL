const router = require('express').Router()
const { query, queryOne } = require('../config/db')
const auth = require('../middleware/auth')

// GET /api/effectifs?unite_id=X
router.get('/', auth, async (req, res) => {
  try {
    const { unite_id } = req.query
    let sql = `
      SELECT e.*, g.nom_complet AS grade_nom, u.nom AS unite_nom, u.code AS unite_code
      FROM effectifs e
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
    `
    const params = []
    if (unite_id) { sql += ' WHERE e.unite_id = ?'; params.push(unite_id) }
    sql += ' ORDER BY COALESCE(g.rang, 0) DESC, e.nom ASC'
    const rows = await query(sql, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/effectifs/all (for dropdowns)
router.get('/all', auth, async (req, res) => {
  try {
    const rows = await query('SELECT id, nom, prenom, unite_id FROM effectifs ORDER BY nom, prenom')
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/effectifs/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const row = await queryOne(`
      SELECT e.*, g.nom_complet AS grade_nom, u.nom AS unite_nom, u.code AS unite_code
      FROM effectifs e
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      WHERE e.id = ?
    `, [req.params.id])
    if (!row) return res.status(404).json({ success: false, message: 'Effectif non trouvé' })
    res.json({ success: true, data: row })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/effectifs
router.post('/', auth, async (req, res) => {
  try {
    const f = req.body
    const [result] = await require('../config/db').pool.execute(
      `INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, specialite, 
        date_naissance, lieu_naissance, nationalite, taille_cm,
        arme_principale, arme_secondaire, equipement_special, tenue,
        historique, date_entree_ig, date_entree_irl)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [f.nom, f.prenom, f.surnom || null, f.unite_id || null, f.grade_id || null,
       f.specialite || null, f.date_naissance || null, f.lieu_naissance || null,
       f.nationalite || 'Allemande', f.taille_cm || null,
       f.arme_principale || null, f.arme_secondaire || null,
       f.equipement_special || null, f.tenue || null,
       f.historique || null, f.date_entree_ig || null, f.date_entree_irl || null]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
