const router = require('express').Router()
const { query } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// GET /api/search?q=X&filter=all|effectif|rapport
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { q, filter = 'all' } = req.query
    if (!q) return res.json({ success: true, data: { effectifs: [], rapports: [], documentation: [] } })

    const like = `%${q}%`
    const result = { effectifs: [], rapports: [], documentation: [] }

    if (filter === 'all' || filter === 'effectif') {
      result.effectifs = await query(`
        SELECT e.id, e.nom, e.prenom, g.nom_complet AS grade_nom, u.nom AS unite_nom
        FROM effectifs e
        LEFT JOIN grades g ON g.id = e.grade_id
        LEFT JOIN unites u ON u.id = e.unite_id
        WHERE e.nom LIKE ? OR e.prenom LIKE ? OR e.surnom LIKE ?
        ORDER BY e.nom LIMIT 20
      `, [like, like, like])
    }

    if (filter === 'all' || filter === 'rapport') {
      result.rapports = await query(`
        SELECT id, titre, auteur_nom, type, date_irl
        FROM rapports
        WHERE titre LIKE ? OR auteur_nom LIKE ? OR personne_renseignee_nom LIKE ?
        ORDER BY created_at DESC LIMIT 20
      `, [like, like, like])
    }

    if (filter === 'all' || filter === 'documentation') {
      result.documentation = await query(`
        SELECT id, titre, description, url, categorie, is_repertoire
        FROM documentation
        WHERE visible = 1 AND (titre LIKE ? OR description LIKE ?)
        ORDER BY ordre, titre LIMIT 20
      `, [like, like])
    }

    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
