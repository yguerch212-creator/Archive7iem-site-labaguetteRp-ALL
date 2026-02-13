const router = require('express').Router()
const { query, queryOne } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')
const recenseur = require('../middleware/recenseur')
const admin = require('../middleware/admin')
const { upload, handleUploadError } = require('../middleware/upload')

// GET /api/effectifs?unite_id=X (guest accessible)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { unite_id } = req.query
    let sql = `
      SELECT e.*, g.nom_complet AS grade_nom, g.categorie AS grade_categorie, u.nom AS unite_nom, u.code AS unite_code
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
    const rows = await query(`
      SELECT e.id, e.nom, e.prenom, e.unite_id, e.grade_id,
        g.nom_complet AS grade_nom, u.code AS unite_code
      FROM effectifs e
      LEFT JOIN grades g ON e.grade_id = g.id
      LEFT JOIN unites u ON e.unite_id = u.id
      ORDER BY e.nom, e.prenom
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/effectifs/:id (guest accessible)
router.get('/:id', optionalAuth, async (req, res) => {
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

// POST /api/effectifs (admin ou recenseur)
router.post('/', auth, recenseur, async (req, res) => {
  try {
    const f = req.body
    const [result] = await require('../config/db').pool.execute(
      `INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, fonction, categorie, specialite, 
        date_naissance, lieu_naissance, nationalite, taille_cm,
        arme_principale, arme_secondaire, equipement_special, tenue,
        historique, date_entree_ig, date_entree_irl)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [f.nom, f.prenom, f.surnom || null, f.unite_id || null, f.grade_id || null,
       f.fonction || null, f.categorie || null, f.specialite || null,
       f.date_naissance || null, f.lieu_naissance || null,
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

// PUT /api/effectifs/:id (admin ou recenseur)
router.put('/:id', auth, recenseur, async (req, res) => {
  try {
    const f = req.body
    await require('../config/db').pool.execute(
      `UPDATE effectifs SET nom=?, prenom=?, surnom=?, unite_id=?, grade_id=?, fonction=?, categorie=?, specialite=?,
        date_naissance=?, lieu_naissance=?, nationalite=?, taille_cm=?,
        arme_principale=?, arme_secondaire=?, equipement_special=?, tenue=?,
        historique=?, date_entree_ig=?, date_entree_irl=?
       WHERE id=?`,
      [f.nom, f.prenom, f.surnom || null, f.unite_id || null, f.grade_id || null,
       f.fonction || null, f.categorie || null, f.specialite || null,
       f.date_naissance || null, f.lieu_naissance || null,
       f.nationalite || 'Allemande', f.taille_cm || null,
       f.arme_principale || null, f.arme_secondaire || null,
       f.equipement_special || null, f.tenue || null,
       f.historique || null, f.date_entree_ig || null, f.date_entree_irl || null,
       req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/effectifs/:id/photo — Upload photo d'identité
router.post('/:id/photo', auth, recenseur, upload.single('photo'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier' })
    const photoUrl = `/uploads/${req.file.destination.split('/uploads/')[1]}/${req.file.filename}`
    await require('../config/db').pool.execute('UPDATE effectifs SET photo = ? WHERE id = ?', [photoUrl, req.params.id])
    res.json({ success: true, data: { photo: photoUrl } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/effectifs/:id (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    await require('../config/db').pool.execute('DELETE FROM effectifs WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
