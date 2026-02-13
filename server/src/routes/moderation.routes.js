const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')

// GET /api/moderation/pending — All pending items across the site
router.get('/pending', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isRecenseur && !req.user.isOfficier) {
      return res.status(403).json({ success: false, message: 'Accès réservé' })
    }

    // Pending documentation
    const docs = await query(`
      SELECT d.id, d.titre, d.description, d.url, d.categorie, d.created_at,
             u.username AS created_by_nom
      FROM documentation d
      JOIN users u ON u.id = d.created_by
      WHERE d.visible = 0 AND EXISTS (SELECT 1 FROM moderation_queue mq WHERE mq.item_id = d.id AND mq.item_type = 'documentation' AND mq.statut = 'En attente')
      ORDER BY d.created_at DESC
    `).catch(() => [])

    // Pending permissions d'absence
    const permissions = await query(`
      SELECT pa.id, pa.date_debut, pa.date_fin, pa.raison, pa.statut, pa.created_at,
             e.prenom, e.nom, g.nom_complet AS grade_nom, un.code AS unite_code
      FROM permissions_absence pa
      JOIN effectifs e ON e.id = pa.effectif_id
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites un ON un.id = e.unite_id
      WHERE pa.statut = 'En attente'
      ORDER BY pa.created_at DESC
    `).catch(() => [])

    // Recent rapports (last 7 days, for review)
    const rapports = await query(`
      SELECT r.id, r.numero, r.titre, r.type, r.auteur_nom, r.created_at,
             r.date_irl
      FROM rapports r
      WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY r.created_at DESC
      LIMIT 20
    `).catch(() => [])

    // Recent interdits (active)
    const interdits = await query(`
      SELECT i.id, i.motif, i.type, i.date_debut, i.actif, i.created_at,
             e.prenom AS effectif_prenom, e.nom AS effectif_nom,
             g.nom_complet AS effectif_grade
      FROM interdits_front i
      JOIN effectifs e ON e.id = i.effectif_id
      LEFT JOIN grades g ON g.id = e.grade_id
      WHERE i.actif = 1
      ORDER BY i.created_at DESC
    `).catch(() => [])

    res.json({
      success: true,
      data: { docs, permissions, rapports, interdits }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
