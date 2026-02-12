const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const admin = require('../middleware/admin')

// GET /api/rapports
router.get('/', auth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT id, titre, auteur_nom, personne_renseignee_nom, recommande_nom, mise_en_cause_nom, type, date_rp, date_irl, published, created_at,
        COALESCE(personne_renseignee_nom, recommande_nom, mise_en_cause_nom) AS personne_mentionnee
      FROM rapports ORDER BY created_at DESC
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/rapports/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM rapports WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ success: false, message: 'Rapport non trouvé' })
    res.json({ success: true, data: row })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/rapports
router.post('/', auth, async (req, res) => {
  try {
    const f = req.body
    const [result] = await pool.execute(
      `INSERT INTO rapports (type, titre, auteur_nom, auteur_id, personne_renseignee_nom,
        unite_id, grade_id, contexte, resume, bilan, remarques,
        recommande_nom, recommande_grade, raison_1, recompense,
        intro_nom, intro_grade, mise_en_cause_nom, mise_en_cause_grade,
        lieu_incident, compte_rendu, signature_nom, signature_grade,
        date_rp, date_irl)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [f.type || 'rapport', f.titre, f.auteur_nom || null, f.auteur_id || null,
       f.personne_renseignee_nom || null, f.unite_id || null, f.grade_id || null,
       f.contexte || null, f.resume || null, f.bilan || null, f.remarques || null,
       f.recommande_nom || null, f.recommande_grade || null, f.raison_1 || null, f.recompense || null,
       f.intro_nom || null, f.intro_grade || null, f.mise_en_cause_nom || null, f.mise_en_cause_grade || null,
       f.lieu_incident || null, f.compte_rendu || null, f.signature_nom || null, f.signature_grade || null,
       f.date_rp || null, f.date_irl || null]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/rapports/:id/publish
router.put('/:id/publish', auth, async (req, res) => {
  try {
    const { contenu_html } = req.body
    await pool.execute('UPDATE rapports SET contenu_html = ?, published = 1 WHERE id = ?', [contenu_html, req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/rapports/:id (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM rapports WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
