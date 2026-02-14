const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

const canEditOrga = (user) => user.isAdmin || user.isEtatMajor

// GET /api/organigramme
router.get('/', optionalAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT o.*, e.prenom, e.nom, e.surnom, g.nom_complet AS grade_nom, g.rang AS grade_rang,
             u.nom AS unite_nom, u.code AS unite_code, u.couleur AS unite_couleur
      FROM organigramme o
      LEFT JOIN effectifs e ON e.id = o.effectif_id
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = o.unite_id
      ORDER BY o.ordre ASC
    `)
    res.json({ success: true, data: rows })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/organigramme/layout — get saved layout
router.get('/layout', optionalAuth, async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM organigramme_layout ORDER BY id DESC LIMIT 1')
    res.json({ success: true, data: row || null })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/organigramme/layout — save layout (admin/etat-major only)
router.put('/layout', auth, async (req, res) => {
  try {
    if (!canEditOrga(req.user)) return res.status(403).json({ success: false, message: 'Réservé à l\'état-major' })
    const { layout } = req.body
    const existing = await queryOne('SELECT id FROM organigramme_layout ORDER BY id DESC LIMIT 1')
    if (existing) {
      await pool.execute('UPDATE organigramme_layout SET layout=?, updated_by=? WHERE id=?',
        [JSON.stringify(layout), req.user.effectif_id || req.user.id, existing.id])
    } else {
      await pool.execute('INSERT INTO organigramme_layout (layout, updated_by) VALUES (?,?)',
        [JSON.stringify(layout), req.user.effectif_id || req.user.id])
    }
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/organigramme — add node
router.post('/', auth, async (req, res) => {
  try {
    if (!canEditOrga(req.user)) return res.status(403).json({ success: false, message: 'Réservé à l\'état-major' })
    const { effectif_id, titre_poste, parent_id, unite_id, ordre, pos_x, pos_y } = req.body
    const [result] = await pool.execute(
      'INSERT INTO organigramme (effectif_id, titre_poste, parent_id, unite_id, ordre, pos_x, pos_y) VALUES (?,?,?,?,?,?,?)',
      [effectif_id || null, titre_poste || null, parent_id || null, unite_id || null, ordre || 0, pos_x ?? 0, pos_y ?? 0]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/organigramme/bulk — save entire tree order (MUST be before /:id)
router.put('/bulk/save', auth, async (req, res) => {
  try {
    if (!canEditOrga(req.user)) return res.status(403).json({ success: false, message: 'Réservé à l\'état-major' })
    const { nodes } = req.body // [{id, parent_id, ordre}]
    if (!Array.isArray(nodes)) return res.status(400).json({ success: false, message: 'nodes requis' })
    for (const n of nodes) {
      await pool.execute('UPDATE organigramme SET parent_id=?, ordre=?, pos_x=?, pos_y=? WHERE id=?',
        [n.parent_id || null, n.ordre || 0, n.pos_x ?? 0, n.pos_y ?? 0, n.id])
    }
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/organigramme/:id
router.put('/:id', auth, async (req, res) => {
  try {
    if (!canEditOrga(req.user)) return res.status(403).json({ success: false, message: 'Réservé à l\'état-major' })
    const { effectif_id, titre_poste, parent_id, unite_id, ordre, pos_x, pos_y } = req.body
    await pool.execute(
      'UPDATE organigramme SET effectif_id=?, titre_poste=?, parent_id=?, unite_id=?, ordre=?, pos_x=?, pos_y=? WHERE id=?',
      [effectif_id || null, titre_poste || null, parent_id || null, unite_id || null, ordre || 0, pos_x ?? 0, pos_y ?? 0, req.params.id]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/organigramme/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!canEditOrga(req.user)) return res.status(403).json({ success: false, message: 'Réservé à l\'état-major' })
    // Reparent children to deleted node's parent
    const node = await queryOne('SELECT parent_id FROM organigramme WHERE id=?', [req.params.id])
    if (node) await pool.execute('UPDATE organigramme SET parent_id=? WHERE parent_id=?', [node.parent_id, req.params.id])
    await pool.execute('DELETE FROM organigramme WHERE id=?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
