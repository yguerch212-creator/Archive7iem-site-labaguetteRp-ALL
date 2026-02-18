const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// GET /api/habillement/demandes — List demandes (own for soldiers, all for officers)
router.get('/demandes', auth, async (req, res) => {
  try {
    let sql, params
    if (req.user.isAdmin || req.user.isOfficier || req.user.isRecenseur) {
      sql = `SELECT d.*, CONCAT(e.prenom,' ',e.nom) as effectif_nom,
             CONCAT(v.prenom,' ',v.nom) as traite_par_nom
             FROM demandes_habillement d
             LEFT JOIN effectifs e ON e.id = d.effectif_id
             LEFT JOIN effectifs v ON v.id = d.traite_par
             ORDER BY d.created_at DESC LIMIT 200`
      params = []
    } else {
      sql = `SELECT d.*, CONCAT(v.prenom,' ',v.nom) as traite_par_nom
             FROM demandes_habillement d
             LEFT JOIN effectifs v ON v.id = d.traite_par
             WHERE d.effectif_id = ? ORDER BY d.created_at DESC`
      params = [req.user.effectif_id]
    }
    res.json({ success: true, data: await query(sql, params) })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/habillement/demandes — Créer une demande
router.post('/demandes', auth, async (req, res) => {
  try {
    const { description, motif } = req.body
    if (!description) return res.status(400).json({ success: false, message: 'Description requise' })
    const effectifId = req.user.effectif_id
    if (!effectifId) return res.status(400).json({ success: false, message: 'Effectif requis' })
    const [result] = await pool.execute(
      'INSERT INTO demandes_habillement (effectif_id, description, motif) VALUES (?, ?, ?)',
      [effectifId, description, motif || null]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/habillement/demandes/:id/validate — Approuver ou refuser
router.put('/demandes/:id/validate', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isRecenseur)
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    const { statut, reponse } = req.body
    if (!['approuve', 'refuse'].includes(statut))
      return res.status(400).json({ success: false, message: 'Statut invalide' })
    await pool.execute(
      'UPDATE demandes_habillement SET statut = ?, reponse = ?, traite_par = ? WHERE id = ?',
      [statut, reponse || null, req.user.effectif_id || null, req.params.id]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/habillement/pending-count — Count pending for officers
router.get('/pending-count', auth, async (req, res) => {
  try {
    const row = await queryOne("SELECT COUNT(*) as c FROM demandes_habillement WHERE statut = 'en_attente'")
    res.json({ success: true, count: row.c })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
