const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')
const admin = require('../middleware/admin')

// GET /api/dossiers — List all dossiers (filtered by visibility for non-admin)
router.get('/', auth, async (req, res) => {
  try {
    const isPrivileged = req.user.isAdmin || req.user.isOfficier || req.user.isRecenseur
    const where = isPrivileged ? '' : "WHERE d.visibilite = 'public' OR d.created_by = " + req.user.id
    const rows = await query(`
      SELECT d.*, e.nom AS effectif_nom, e.prenom AS effectif_prenom,
        g.nom_complet AS effectif_grade, u.code AS effectif_unite_code,
        cr.username AS created_by_nom,
        (SELECT COUNT(*) FROM dossier_entrees de WHERE de.dossier_id = d.id) AS nb_entrees
      FROM dossiers d
      LEFT JOIN effectifs e ON e.id = d.effectif_id
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      JOIN users cr ON cr.id = d.created_by
      ${where}
      ORDER BY d.updated_at DESC
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/dossiers/effectif/:effectifId — Get/create personal dossier for an effectif
router.get('/effectif/:effectifId', auth, async (req, res) => {
  try {
    const effectifId = req.params.effectifId

    // Get or create personal dossier
    let dossier = await queryOne(
      "SELECT * FROM dossiers WHERE effectif_id = ? AND type = 'personnel'",
      [effectifId]
    )
    if (!dossier) {
      const eff = await queryOne('SELECT nom, prenom FROM effectifs WHERE id = ?', [effectifId])
      if (!eff) return res.status(404).json({ success: false, message: 'Effectif non trouvé' })
      const [result] = await pool.execute(
        "INSERT INTO dossiers (effectif_id, titre, type, visibilite, created_by) VALUES (?, ?, 'personnel', 'public', ?)",
        [effectifId, `Dossier personnel — ${eff.prenom} ${eff.nom}`, req.user.id]
      )
      dossier = await queryOne('SELECT * FROM dossiers WHERE id = ?', [result.insertId])
    }

    // Get effectif name for matching
    const eff = await queryOne('SELECT nom, prenom FROM effectifs WHERE id = ?', [effectifId])
    const fullName1 = eff ? `${eff.prenom} ${eff.nom}` : ''
    const fullName2 = eff ? `${eff.nom} ${eff.prenom}` : ''
    const lastName = eff ? eff.nom : ''

    // Auto-aggregate: fetch related records
    const [rapports, interdits, medical, entrees] = await Promise.all([
      query(`SELECT DISTINCT r.id, r.titre, r.type, r.date_rp, r.date_irl, r.created_at FROM rapports r
        WHERE r.auteur_id = ?
        OR r.auteur_nom IN (?, ?, ?)
        OR r.recommande_nom IN (?, ?, ?)
        OR r.mise_en_cause_nom IN (?, ?, ?)
        OR r.intro_nom IN (?, ?, ?)
        OR r.personne_renseignee_nom IN (?, ?, ?)
        OR r.id IN (SELECT source_id FROM mentions WHERE source_type = 'rapport' AND effectif_id = ?)
        ORDER BY r.created_at DESC`, 
        [effectifId, fullName1, fullName2, lastName, fullName1, fullName2, lastName, fullName1, fullName2, lastName, fullName1, fullName2, lastName, fullName1, fullName2, lastName, effectifId]),
      query(`SELECT i.*, ord.username AS ordonne_par_nom FROM interdits_front i
        JOIN users ord ON ord.id = i.ordonne_par WHERE i.effectif_id = ?
        ORDER BY i.created_at DESC`, [effectifId]),
      query(`SELECT v.*, med.username AS medecin_nom FROM visites_medicales v
        LEFT JOIN users med ON med.id = v.medecin_id WHERE v.effectif_id = ?
        ORDER BY v.date_visite DESC`, [effectifId]),
      query(`SELECT de.*, cr.username AS created_by_nom FROM dossier_entrees de
        JOIN users cr ON cr.id = de.created_by WHERE de.dossier_id = ?
        ORDER BY de.created_at DESC`, [dossier.id])
    ])

    res.json({
      success: true,
      data: {
        dossier,
        rapports,
        interdits,
        medical,
        entrees // manual entries
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/dossiers/:id — Single dossier with all entries
router.get('/:id', auth, async (req, res) => {
  try {
    const dossier = await queryOne(`
      SELECT d.*, e.nom AS effectif_nom, e.prenom AS effectif_prenom,
        g.nom_complet AS effectif_grade, u.code AS effectif_unite_code
      FROM dossiers d
      LEFT JOIN effectifs e ON e.id = d.effectif_id
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      WHERE d.id = ?
    `, [req.params.id])
    if (!dossier) return res.status(404).json({ success: false, message: 'Dossier non trouvé' })

    const entrees = await query(`
      SELECT de.*, cr.username AS created_by_nom FROM dossier_entrees de
      JOIN users cr ON cr.id = de.created_by WHERE de.dossier_id = ?
      ORDER BY de.created_at DESC
    `, [req.params.id])

    res.json({ success: true, data: { dossier, entrees } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/dossiers — Create a thematic/investigation dossier
router.post('/', auth, async (req, res) => {
  try {
    const { titre, type, description, visibilite, effectif_id } = req.body
    if (!titre) return res.status(400).json({ success: false, message: 'Titre requis' })
    const [result] = await pool.execute(
      'INSERT INTO dossiers (effectif_id, titre, type, description, visibilite, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [effectif_id || null, titre, type || 'thematique', description || null, visibilite || 'public', req.user.id]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/dossiers/:id/entrees — Add entry to dossier
router.post('/:id/entrees', auth, async (req, res) => {
  try {
    const { type, titre, contenu, fichier_url, reference_id, date_rp } = req.body
    const [result] = await pool.execute(
      'INSERT INTO dossier_entrees (dossier_id, type, titre, contenu, fichier_url, reference_id, date_rp, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.params.id, type || 'note', titre || null, contenu || null, fichier_url || null, reference_id || null, date_rp || null, req.user.id]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/dossiers/:id — Update dossier metadata
router.put('/:id', auth, async (req, res) => {
  try {
    const { titre, description, visibilite } = req.body
    await pool.execute(
      'UPDATE dossiers SET titre = ?, description = ?, visibilite = ? WHERE id = ?',
      [titre, description || null, visibilite || 'public', req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/dossiers/:id (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM dossiers WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/dossiers/entrees/:id
router.delete('/entrees/:id', auth, async (req, res) => {
  try {
    const entry = await queryOne('SELECT created_by FROM dossier_entrees WHERE id = ?', [req.params.id])
    if (!entry) return res.status(404).json({ success: false, message: 'Entrée non trouvée' })
    if (entry.created_by !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    }
    await pool.execute('DELETE FROM dossier_entrees WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
