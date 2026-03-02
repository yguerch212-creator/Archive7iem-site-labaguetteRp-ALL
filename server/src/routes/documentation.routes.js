const { logActivity } = require('../utils/logger')
const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')
const admin = require('../middleware/admin')

// Helper: can write docs (admin or officier)
function canWrite(user) { return user.isAdmin || user.isOfficier }
// Helper: can submit (sous-officier+ = grade_rang >= 35, or recenseur)
function canSubmit(user) { return user.isAdmin || user.isOfficier || user.isRecenseur || (user.grade_rang && user.grade_rang >= 35) }
// Helper: can approve (admin or officier)
function canApprove(user) { return user.isAdmin || user.isOfficier }

// GET /api/documentation — all docs + folders (filtered by visibility)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const showAll = canApprove(req.user) && req.query.all === '1'
    const where = showAll ? '' : "WHERE (d.statut = 'approuve' AND d.visible = 1) OR d.is_repertoire = 1"
    const rows = await query(
      `SELECT d.*, u.username AS created_by_nom 
       FROM documentation d 
       LEFT JOIN users u ON u.id = d.created_by 
       ${where}
       ORDER BY d.is_repertoire DESC, d.categorie, d.ordre, d.titre`
    )
    // Filter by visibility (unit + group) unless admin/officier viewing all
    const userUnite = req.user?.unite_code || null
    const isPriv = req.user?.isAdmin || req.user?.isOfficier || req.user?.isEtatMajor
    // Get user's group IDs
    let userGroupIds = []
    if (req.user?.id) {
      const ugs = await query('SELECT group_id FROM user_groups WHERE user_id = ?', [req.user.id])
      userGroupIds = ugs.map(g => g.group_id)
    }
    const filtered = (showAll || isPriv) ? rows : rows.filter(d => {
      if (!d.visibilite_unites && !d.visibilite_groupes) return true
      let match = false
      if (d.visibilite_unites) {
        const units = d.visibilite_unites.split(',').map(s => s.trim())
        if (userUnite && units.includes(userUnite)) match = true
      }
      if (d.visibilite_groupes) {
        const gids = d.visibilite_groupes.split(',').map(s => parseInt(s.trim()))
        if (userGroupIds.some(g => gids.includes(g))) match = true
      }
      return match
    })
    res.json({ success: true, data: filtered })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// GET /api/documentation/pending — docs en attente (officier/admin)
router.get('/pending', auth, async (req, res) => {
  try {
    if (!canApprove(req.user)) return res.status(403).json({ success: false, message: 'Non autorisé' })
    const rows = await query(
      `SELECT d.*, u.username AS created_by_nom 
       FROM documentation d 
       LEFT JOIN users u ON u.id = d.created_by 
       WHERE d.statut = 'en_attente'
       ORDER BY d.created_at ASC`
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// POST /api/documentation/repertoire — create folder (officier/admin only)
router.post('/repertoire', auth, async (req, res) => {
  try {
    if (!canWrite(req.user)) return res.status(403).json({ success: false, message: 'Réservé aux officiers' })
    const { titre, description, categorie, visibilite_unites, visibilite_groupes } = req.body
    if (!titre) return res.status(400).json({ success: false, message: 'Titre requis' })
    const [result] = await pool.execute(
      'INSERT INTO documentation (titre, description, categorie, is_repertoire, statut, created_by, visibilite_unites, visibilite_groupes) VALUES (?, ?, ?, 1, ?, ?, ?, ?)',
      [titre, description || null, categorie || 'Autre', 'approuve', req.user.id, visibilite_unites || null, visibilite_groupes || null]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// POST /api/documentation — add document
router.post('/', auth, async (req, res) => {
  try {
    if (!canSubmit(req.user)) return res.status(403).json({ success: false, message: 'Non autorisé' })
    const { titre, description, url, categorie, ordre, repertoire_id, visibilite_unites, visibilite_groupes } = req.body
    if (!titre) return res.status(400).json({ success: false, message: 'Titre requis' })
    
    // Officiers/admin → auto-approved; sous-officiers → en_attente
    const statut = canWrite(req.user) ? 'approuve' : 'en_attente'
    
    const [result] = await pool.execute(
      'INSERT INTO documentation (titre, description, url, categorie, ordre, repertoire_id, statut, created_by, visibilite_unites, visibilite_groupes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [titre, description || null, url || null, categorie || 'Autre', ordre || 0, repertoire_id || null, statut, req.user.id, visibilite_unites || null, visibilite_groupes || null]
    )
    res.json({ success: true, data: { id: result.insertId, statut } })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// PUT /api/documentation/:id/approve — approve or refuse (officier/admin)
router.put('/:id/approve', auth, async (req, res) => {
  try {
    if (!canApprove(req.user)) return res.status(403).json({ success: false, message: 'Non autorisé' })
    const { decision } = req.body // 'approuve' or 'refuse'
    if (!['approuve', 'refuse'].includes(decision)) return res.status(400).json({ success: false, message: 'Decision invalide' })
    await pool.execute('UPDATE documentation SET statut = ?, visible = ? WHERE id = ?', 
      [decision, decision === 'approuve' ? 1 : 0, req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// PUT /api/documentation/:id (officier/admin)
router.put('/:id', auth, async (req, res) => {
  try {
    if (!canWrite(req.user)) return res.status(403).json({ success: false, message: 'Réservé aux officiers' })
    const { titre, description, url, categorie, ordre, visible, repertoire_id, visibilite_unites, visibilite_groupes } = req.body
    await pool.execute(
      'UPDATE documentation SET titre=?, description=?, url=?, categorie=?, ordre=?, visible=?, repertoire_id=?, visibilite_unites=?, visibilite_groupes=? WHERE id=?',
      [titre, description || null, url || null, categorie || 'Autre', ordre || 0, visible !== false ? 1 : 0, repertoire_id || null, visibilite_unites || null, visibilite_groupes || null, req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

// DELETE /api/documentation/:id (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    // If folder, delete contents too
    const doc = await queryOne('SELECT is_repertoire FROM documentation WHERE id = ?', [req.params.id])
    if (doc?.is_repertoire) {
      await pool.execute('DELETE FROM documentation WHERE repertoire_id = ?', [req.params.id])
    }
    await pool.execute('DELETE FROM documentation WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: "Erreur serveur" })
  }
})

module.exports = router
