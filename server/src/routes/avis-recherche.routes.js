const router = require('express').Router()
const { query, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')
const feldgendarmerie = require('../middleware/feldgendarmerie')

// GET /api/avis-recherche — List all
router.get('/', optionalAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT ar.*, e.photo AS effectif_photo, e.prenom AS effectif_prenom, e.nom AS effectif_nom,
             u.username AS createur_nom
      FROM avis_recherche ar
      LEFT JOIN effectifs e ON e.id = ar.effectif_id
      LEFT JOIN users u ON u.id = ar.created_by
      ORDER BY ar.created_at DESC
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/avis-recherche/:id — Single
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT ar.*, e.photo AS effectif_photo, e.prenom AS effectif_prenom, e.nom AS effectif_nom,
             u.username AS createur_nom
      FROM avis_recherche ar
      LEFT JOIN effectifs e ON e.id = ar.effectif_id
      LEFT JOIN users u ON u.id = ar.created_by
      WHERE ar.id = ?
    `, [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'Non trouvé' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/avis-recherche — Create (feld + officier + admin)
router.post('/', auth, feldgendarmerie, async (req, res) => {
  try {
    const { nom, prenom, nationalite, signalement, derniere_localisation, motifs, recompense, photo_url, effectif_id } = req.body
    if (!nom) return res.status(400).json({ success: false, message: 'Nom requis' })
    const [result] = await pool.execute(
      `INSERT INTO avis_recherche (nom, prenom, nationalite, signalement, derniere_localisation, motifs, recompense, photo_url, effectif_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nom, prenom || null, nationalite || 'Allemande', signalement || null, derniere_localisation || null, motifs || null, recompense || null, photo_url || null, effectif_id || null, req.user.id]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/avis-recherche/:id/statut — Update status
router.put('/:id/statut', auth, feldgendarmerie, async (req, res) => {
  try {
    const { statut } = req.body
    await pool.execute('UPDATE avis_recherche SET statut = ? WHERE id = ?', [statut, req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/avis-recherche/:id
router.delete('/:id', auth, feldgendarmerie, async (req, res) => {
  try {
    await pool.execute('DELETE FROM avis_recherche WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
