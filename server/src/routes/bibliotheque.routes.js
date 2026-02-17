const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// GET /api/bibliotheque — List all items (optionally filtered by type/unite)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { type, unite_id } = req.query
    let sql = `
      SELECT b.*, u.nom AS unite_nom, u.code AS unite_code,
             CONCAT(us.prenom, ' ', us.nom) AS created_by_nom
      FROM bibliotheque b
      LEFT JOIN unites u ON u.id = b.unite_id
      LEFT JOIN users us ON us.id = b.created_by
      WHERE 1=1
    `
    const params = []
    if (type) { sql += ' AND b.type = ?'; params.push(type) }
    if (unite_id) { sql += ' AND b.unite_id = ?'; params.push(unite_id) }
    sql += ' ORDER BY b.type, b.nom'
    const rows = await query(sql, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/bibliotheque — Add item (officier/admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) {
      return res.status(403).json({ success: false, message: 'Réservé aux officiers' })
    }
    const { type, nom, description, unite_id, image_data } = req.body
    if (!nom || !image_data) {
      return res.status(400).json({ success: false, message: 'Nom et image requis' })
    }
    const [result] = await pool.execute(
      'INSERT INTO bibliotheque (type, nom, description, unite_id, image_data, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [type || 'tampon', nom, description || null, unite_id || null, image_data, req.user.id]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/bibliotheque/:id — Delete item (owner or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await queryOne('SELECT * FROM bibliotheque WHERE id = ?', [req.params.id])
    if (!item) return res.status(404).json({ success: false, message: 'Introuvable' })
    if (!req.user.isAdmin && item.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    }
    await pool.execute('DELETE FROM bibliotheque WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/bibliotheque/my-tampons — Tampons the current user can use (MUST be before /:id)
router.get('/my-tampons', auth, async (req, res) => {
  try {
    const userGroups = await query('SELECT group_id FROM user_groups WHERE user_id = ?', [req.user.id])
    const groupIds = userGroups.map(g => g.group_id)
    const effectifId = req.user.effectif_id

    let sql = `
      SELECT b.id, b.nom, b.image_data, b.unite_id, u.code AS unite_code
      FROM bibliotheque b
      LEFT JOIN unites u ON u.id = b.unite_id
      WHERE b.type = 'tampon'
      AND (
        NOT EXISTS (SELECT 1 FROM bibliotheque_permissions bp WHERE bp.bibliotheque_id = b.id)
    `
    const params = []
    if (groupIds.length > 0) {
      sql += ` OR EXISTS (SELECT 1 FROM bibliotheque_permissions bp WHERE bp.bibliotheque_id = b.id AND bp.group_id IN (${groupIds.map(() => '?').join(',')}))`
      params.push(...groupIds)
    }
    if (effectifId) {
      sql += ` OR EXISTS (SELECT 1 FROM bibliotheque_permissions bp WHERE bp.bibliotheque_id = b.id AND bp.effectif_id = ?)`
      params.push(effectifId)
    }
    sql += `) ORDER BY b.nom`
    const rows = await query(sql, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/bibliotheque/:id/permissions — Get permissions for a tampon
router.get('/:id/permissions', auth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT bp.*, g.name AS group_name, CONCAT(e.prenom, ' ', e.nom) AS effectif_nom
      FROM bibliotheque_permissions bp
      LEFT JOIN \`groups\` g ON g.id = bp.group_id
      LEFT JOIN effectifs e ON e.id = bp.effectif_id
      WHERE bp.bibliotheque_id = ?
    `, [req.params.id])
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/bibliotheque/:id/permissions — Set permissions (admin/officier)
router.put('/:id/permissions', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) {
      return res.status(403).json({ success: false, message: 'Réservé aux officiers et administrateurs' })
    }
    const { permissions } = req.body // [{ group_id?, effectif_id? }]
    const bibId = req.params.id
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.execute('DELETE FROM bibliotheque_permissions WHERE bibliotheque_id = ?', [bibId])
      for (const p of (permissions || [])) {
        if (p.group_id) {
          await conn.execute('INSERT INTO bibliotheque_permissions (bibliotheque_id, group_id) VALUES (?, ?)', [bibId, p.group_id])
        } else if (p.effectif_id) {
          await conn.execute('INSERT INTO bibliotheque_permissions (bibliotheque_id, effectif_id) VALUES (?, ?)', [bibId, p.effectif_id])
        }
      }
      await conn.commit()
    } catch (e) { await conn.rollback(); throw e }
    finally { conn.release() }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
