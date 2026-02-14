const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

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

// POST /api/organigramme — add node
router.post('/', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) return res.status(403).json({ success: false, message: 'Réservé aux officiers' })
    const { effectif_id, titre_poste, parent_id, unite_id, ordre, pos_x, pos_y } = req.body
    const [result] = await pool.execute(
      'INSERT INTO organigramme (effectif_id, titre_poste, parent_id, unite_id, ordre, pos_x, pos_y) VALUES (?,?,?,?,?,?,?)',
      [effectif_id || null, titre_poste || null, parent_id || null, unite_id || null, ordre || 0, pos_x ?? 0, pos_y ?? 0]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/organigramme/:id
router.put('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) return res.status(403).json({ success: false, message: 'Réservé aux officiers' })
    const { effectif_id, titre_poste, parent_id, unite_id, ordre, pos_x, pos_y } = req.body
    await pool.execute(
      'UPDATE organigramme SET effectif_id=?, titre_poste=?, parent_id=?, unite_id=?, ordre=?, pos_x=?, pos_y=? WHERE id=?',
      [effectif_id || null, titre_poste || null, parent_id || null, unite_id || null, ordre || 0, pos_x ?? 0, pos_y ?? 0, req.params.id]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/organigramme/bulk — save entire tree order
router.put('/bulk/save', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) return res.status(403).json({ success: false, message: 'Réservé aux officiers' })
    const { nodes } = req.body // [{id, parent_id, ordre}]
    if (!Array.isArray(nodes)) return res.status(400).json({ success: false, message: 'nodes requis' })
    for (const n of nodes) {
      await pool.execute('UPDATE organigramme SET parent_id=?, ordre=?, pos_x=?, pos_y=? WHERE id=?',
        [n.parent_id || null, n.ordre || 0, n.pos_x ?? 0, n.pos_y ?? 0, n.id])
    }
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/organigramme/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) return res.status(403).json({ success: false, message: 'Réservé aux officiers' })
    // Reparent children to deleted node's parent
    const node = await queryOne('SELECT parent_id FROM organigramme WHERE id=?', [req.params.id])
    if (node) await pool.execute('UPDATE organigramme SET parent_id=? WHERE parent_id=?', [node.parent_id, req.params.id])
    await pool.execute('DELETE FROM organigramme WHERE id=?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
