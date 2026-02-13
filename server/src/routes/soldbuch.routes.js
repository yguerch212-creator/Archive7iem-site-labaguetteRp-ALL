const router = require('express').Router()
const { queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// GET /api/soldbuch/:effectif_id (guest can view)
router.get('/:effectifId', optionalAuth, async (req, res) => {
  try {
    const effectif = await queryOne(`
      SELECT e.*, g.nom_complet AS grade_nom, u.nom AS unite_nom, u.code AS unite_code
      FROM effectifs e
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      WHERE e.id = ?
    `, [req.params.effectifId])
    if (!effectif) return res.status(404).json({ success: false, message: 'Effectif non trouvé' })

    const layout = await queryOne('SELECT layout_json FROM effectif_layouts WHERE effectif_id = ?', [req.params.effectifId])
    let layoutData = {}
    if (layout && layout.layout_json) {
      layoutData = typeof layout.layout_json === 'string' ? JSON.parse(layout.layout_json) : layout.layout_json
    }

    res.json({
      success: true,
      data: {
        effectif,
        layout: layoutData
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/soldbuch/:effectif_id/layout (owner, admin, or recenseur)
router.put('/:effectifId/layout', auth, async (req, res) => {
  try {
    const isOwner = req.user.effectif_id === parseInt(req.params.effectifId)
    if (!isOwner && !req.user.isAdmin && !req.user.isRecenseur) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez modifier que votre propre Soldbuch' })
    }
    const { layout } = req.body
    const json = JSON.stringify(layout)
    const existing = await queryOne('SELECT id FROM effectif_layouts WHERE effectif_id = ?', [req.params.effectifId])
    if (existing) {
      await pool.execute('UPDATE effectif_layouts SET layout_json = ? WHERE effectif_id = ?', [json, req.params.effectifId])
    } else {
      await pool.execute('INSERT INTO effectif_layouts (effectif_id, layout_json) VALUES (?, ?)', [req.params.effectifId, json])
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
