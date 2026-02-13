const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const recenseur = require('../middleware/recenseur')

// GET /api/medical — Toutes les visites
router.get('/', auth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT v.*,
             e.nom AS effectif_nom, e.prenom AS effectif_prenom,
             g.nom_complet AS effectif_grade, u.code AS effectif_unite_code, u.nom AS effectif_unite_nom,
             c.username AS created_by_nom
      FROM visites_medicales v
      JOIN effectifs e ON e.id = v.effectif_id
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      JOIN users c ON c.id = v.created_by
      ORDER BY v.date_visite DESC
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/medical/effectif/:effectif_id — Historique médical d'un effectif
router.get('/effectif/:effectif_id', auth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT v.*, c.username AS created_by_nom
      FROM visites_medicales v
      JOIN users c ON c.id = v.created_by
      WHERE v.effectif_id = ?
      ORDER BY v.date_visite DESC
    `, [req.params.effectif_id])
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/medical/:id — Single visite
router.get('/:id', auth, async (req, res) => {
  try {
    const row = await queryOne(`
      SELECT v.*,
             e.nom AS effectif_nom, e.prenom AS effectif_prenom, e.date_naissance, e.lieu_naissance, e.taille_cm, e.specialite,
             g.nom_complet AS effectif_grade, u.code AS effectif_unite_code, u.nom AS effectif_unite_nom,
             c.username AS created_by_nom
      FROM visites_medicales v
      JOIN effectifs e ON e.id = v.effectif_id
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      JOIN users c ON c.id = v.created_by
      WHERE v.id = ?
    `, [req.params.id])
    if (!row) return res.status(404).json({ success: false, message: 'Visite introuvable' })
    res.json({ success: true, data: row })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/medical — Créer une visite (recenseur/admin + Sanitäts)
router.post('/', auth, async (req, res) => {
  try {
    // Admin, recenseur, or Sanitäts (916S) can create
    const isSanitats = req.user.unite_code === '916S' || req.user.unite_nom?.includes('Sanit')
    if (!req.user.isAdmin && !req.user.isRecenseur && !isSanitats) {
      return res.status(403).json({ success: false, message: 'Accès réservé — Sanitäts, recenseurs ou administrateurs' })
    }

    const { effectif_id, date_visite, medecin, diagnostic, aptitude, restrictions, notes_confidentielles,
      poids, imc, groupe_sanguin, allergenes, antecedents_medicaux, antecedents_psy,
      conso_drogue, conso_alcool, conso_tabac,
      test_vue, test_ouie, test_cardio, test_reflex, test_tir, score_aptitude, commentaire, facture
    } = req.body
    if (!effectif_id || !date_visite) {
      return res.status(400).json({ success: false, message: 'effectif_id et date_visite requis' })
    }

    const [result] = await pool.execute(
      `INSERT INTO visites_medicales (effectif_id, date_visite, medecin, diagnostic, aptitude, restrictions, notes_confidentielles,
        poids, imc, groupe_sanguin, allergenes, antecedents_medicaux, antecedents_psy,
        conso_drogue, conso_alcool, conso_tabac,
        test_vue, test_ouie, test_cardio, test_reflex, test_tir, score_aptitude, commentaire, facture, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [effectif_id, date_visite, medecin || null, diagnostic || null, aptitude || 'Apte', restrictions || null, notes_confidentielles || null,
        poids || null, imc || null, groupe_sanguin || null, allergenes || null, antecedents_medicaux || null, antecedents_psy || null,
        conso_drogue || null, conso_alcool || null, conso_tabac || null,
        test_vue || null, test_ouie || null, test_cardio || null, test_reflex || null, test_tir || null, score_aptitude || null, commentaire || null, facture || '100 RM', req.user.id]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/medical/:id
router.put('/:id', auth, recenseur, async (req, res) => {
  try {
    const { date_visite, medecin, diagnostic, aptitude, restrictions, notes_confidentielles } = req.body
    await pool.execute(
      `UPDATE visites_medicales SET date_visite=?, medecin=?, diagnostic=?, aptitude=?, restrictions=?, notes_confidentielles=? WHERE id=?`,
      [date_visite, medecin || null, diagnostic || null, aptitude || 'Apte', restrictions || null, notes_confidentielles || null, req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/medical/:id (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: 'Admin uniquement' })
    await pool.execute('DELETE FROM visites_medicales WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/medical/:id/valider — validate visite (officier sanitäts or admin)
router.put('/:id/valider', auth, async (req, res) => {
  // Only admin, officier, or sanitäts can validate
  if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isSanitaets) {
    return res.status(403).json({ success: false, message: 'Officier Sanitäts requis' })
  }
  const { signature_data } = req.body
  try {
    await pool.execute(
      'UPDATE visites_medicales SET valide = 1, valide_par = ?, valide_at = NOW(), signature_medecin = ? WHERE id = ?',
      [req.user.id, signature_data || null, req.params.id]
    )
    // Save personal signature if provided
    if (signature_data && req.user.effectif_id) {
      await pool.execute(
        `INSERT INTO signatures_effectifs (effectif_id, signature_data) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE signature_data = VALUES(signature_data)`,
        [req.user.effectif_id, signature_data]
      )
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/medical/pending — list unvalidated visites
router.get('/pending/list', auth, async (req, res) => {
  if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isSanitaets) {
    return res.status(403).json({ success: false, message: 'Non autorisé' })
  }
  try {
    const [rows] = await pool.execute(`
      SELECT v.id, v.date_visite, v.diagnostic, v.aptitude, v.created_at,
        e.nom, e.prenom, g.nom_complet AS grade_nom, u2.code AS unite_code
      FROM visites_medicales v
      LEFT JOIN effectifs e ON v.effectif_id = e.id
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u2 ON u2.id = e.unite_id
      WHERE v.valide = 0
      ORDER BY v.created_at DESC
    `)
    res.json({ data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/medical/my-signature — get saved signature
router.get('/my-signature', auth, async (req, res) => {
  if (!req.user.effectif_id) return res.json({ data: null })
  try {
    const [rows] = await pool.execute('SELECT signature_data FROM signatures_effectifs WHERE effectif_id = ?', [req.user.effectif_id])
    res.json({ data: rows[0]?.signature_data || null })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
