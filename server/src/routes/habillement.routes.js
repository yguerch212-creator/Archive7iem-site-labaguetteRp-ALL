const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')
const { createAutoAttestation } = require('./attestations.routes')

// GET /api/habillement/demandes — List demandes (own for soldiers, all for officers)
router.get('/demandes', auth, async (req, res) => {
  try {
    let sql, params
    const statutFilter = req.query.statut
    if (req.user.isAdmin || req.user.isOfficier || req.user.isRecenseur) {
      sql = `SELECT d.*, CONCAT(e.prenom,' ',e.nom) as effectif_nom, e.prenom, e.nom,
             g.nom_complet as grade_nom,
             CONCAT(v.prenom,' ',v.nom) as traite_par_nom
             FROM demandes_habillement d
             LEFT JOIN effectifs e ON e.id = d.effectif_id
             LEFT JOIN grades g ON g.id = e.grade_id
             LEFT JOIN effectifs v ON v.id = d.traite_par
             ${statutFilter ? 'WHERE d.statut = ?' : ''}
             ORDER BY d.created_at DESC LIMIT 200`
      params = statutFilter ? [statutFilter] : []
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
    if (!req.user.isOfficier)
      return res.status(403).json({ success: false, message: 'Seuls les officiers peuvent valider les demandes d\'habillement' })
    const { statut, reponse } = req.body
    if (!['approuve', 'refuse'].includes(statut))
      return res.status(400).json({ success: false, message: 'Statut invalide' })
    // Get the demande first to know effectif_id
    const demande = await queryOne('SELECT * FROM demandes_habillement WHERE id = ?', [req.params.id])
    if (!demande) return res.status(404).json({ success: false, message: 'Demande introuvable' })
    if (demande.statut !== 'en_attente') return res.status(400).json({ success: false, message: 'Demande déjà traitée' })

    await pool.execute(
      'UPDATE demandes_habillement SET statut = ?, reponse = ?, traite_par = ? WHERE id = ?',
      [statut, reponse || null, req.user.effectif_id || null, req.params.id]
    )

    // If approved, create attestation in Soldbuch
    if (statut === 'approuve' && demande.effectif_id) {
      try {
        await createAutoAttestation(
          demande.effectif_id,
          `Habillement approuvé : ${demande.description}`,
          'habillement',
          demande.id,
          req.user.id,
          '6' // page 6 = habillement
        )
      } catch (e) { /* non-blocking */ }
    }

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
