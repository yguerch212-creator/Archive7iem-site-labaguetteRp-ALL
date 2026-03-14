const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// ==================== HELPERS ====================

// Check if user is member of bataillon (or has bypass privileges)
async function isMemberOrPrivileged(userId, bataillonId, user) {
  if (user?.isAdmin || user?.isOfficier || user?.isEtatMajor) return true
  if (!userId) return false
  const membership = await queryOne(
    'SELECT id FROM bataillon_membres bm JOIN effectifs e ON e.id = bm.effectif_id JOIN users u ON u.effectif_id = e.id WHERE u.id = ? AND bm.bataillon_id = ?',
    [userId, bataillonId]
  )
  return !!membership
}

// ==================== BATAILLONS ====================

// GET /api/bataillons — list all (public: cards visible, but membership info included)
router.get('/', auth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT b.*,
        (SELECT COUNT(*) FROM bataillon_membres WHERE bataillon_id = b.id) AS nb_membres,
        (SELECT COUNT(*) FROM bataillon_ordres WHERE bataillon_id = b.id AND statut = 'en_cours') AS ordres_actifs,
        ce.nom AS chef_nom, ce.prenom AS chef_prenom,
        cg.nom_complet AS chef_grade
      FROM bataillons b
      LEFT JOIN effectifs ce ON ce.id = b.chef_effectif_id
      LEFT JOIN grades cg ON cg.id = ce.grade_id
      ORDER BY b.numero
    `)

    // Check user membership for each bataillon
    for (const b of rows) {
      b.isMember = await isMemberOrPrivileged(req.user.id, b.id, req.user)
    }

    // Bataillon du mois courant
    const now = new Date()
    const mois = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
    const bdm = await queryOne('SELECT * FROM bataillon_du_mois WHERE mois = ?', [mois])
    res.json({ success: true, data: rows, bataillonDuMois: bdm })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// GET /api/bataillons/:id — detail with members (restricted to members)
router.get('/:id', auth, async (req, res) => {
  try {
    const allowed = await isMemberOrPrivileged(req.user.id, req.params.id, req.user)
    if (!allowed) return res.status(403).json({ success: false, message: 'Acces reserve aux membres du bataillon' })

    const bat = await queryOne(`
      SELECT b.*,
        ce.nom AS chef_nom, ce.prenom AS chef_prenom, cg.nom_complet AS chef_grade
      FROM bataillons b
      LEFT JOIN effectifs ce ON ce.id = b.chef_effectif_id
      LEFT JOIN grades cg ON cg.id = ce.grade_id
      WHERE b.id = ?
    `, [req.params.id])
    if (!bat) return res.status(404).json({ success: false, message: 'Bataillon introuvable' })

    const membres = await query(`
      SELECT bm.*, e.nom, e.prenom, e.surnom, g.nom_complet AS grade_nom, g.rang AS grade_rang, u.nom AS unite_nom
      FROM bataillon_membres bm
      JOIN effectifs e ON e.id = bm.effectif_id
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      WHERE bm.bataillon_id = ?
      ORDER BY COALESCE(g.rang, 0) DESC, e.nom
    `, [req.params.id])

    // Decorations des membres du bataillon
    const membreIds = membres.map(m => m.effectif_id)
    let decorations = []
    if (membreIds.length > 0) {
      decorations = await query(`
        SELECT ed.*, d.nom AS decoration_nom, d.image_url, e.nom AS effectif_nom, e.prenom AS effectif_prenom
        FROM effectif_decorations ed
        LEFT JOIN decorations d ON d.id = ed.decoration_id
        LEFT JOIN effectifs e ON e.id = ed.effectif_id
        WHERE ed.effectif_id IN (${membreIds.map(() => '?').join(',')})
        ORDER BY ed.date_attribution DESC LIMIT 20
      `, membreIds)
    }

    // Palmares bataillon du mois
    const palmares = await query('SELECT * FROM bataillon_du_mois WHERE bataillon_id = ? ORDER BY mois DESC', [req.params.id])

    res.json({ success: true, data: { ...bat, membres, decorations, palmares } })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// ==================== MEMBRES ====================

// POST /api/bataillons/:id/membres — add member
router.post('/:id/membres', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isEtatMajor) return res.status(403).json({ success: false, message: 'Non autorise' })
    const { effectif_id, role } = req.body
    await pool.execute('INSERT IGNORE INTO bataillon_membres (bataillon_id, effectif_id, role) VALUES (?, ?, ?)',
      [req.params.id, effectif_id, role || 'membre'])
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// DELETE /api/bataillons/:id/membres/:effectifId — remove member
router.delete('/:id/membres/:effectifId', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isEtatMajor) return res.status(403).json({ success: false, message: 'Non autorise' })
    await pool.execute('DELETE FROM bataillon_membres WHERE bataillon_id = ? AND effectif_id = ?',
      [req.params.id, req.params.effectifId])
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// ==================== ORDRES DE MISSION ====================

// GET /api/bataillons/:id/ordres (restricted)
router.get('/:id/ordres', auth, async (req, res) => {
  try {
    const allowed = await isMemberOrPrivileged(req.user.id, req.params.id, req.user)
    if (!allowed) return res.status(403).json({ success: false, message: 'Acces reserve aux membres' })

    const ordres = await query(`
      SELECT o.*, u.username AS created_by_nom,
        (SELECT COUNT(*) FROM bataillon_ordre_taches WHERE ordre_id = o.id) AS total_taches,
        (SELECT COUNT(*) FROM bataillon_ordre_taches WHERE ordre_id = o.id AND completed = 1) AS taches_completees
      FROM bataillon_ordres o
      LEFT JOIN users u ON u.id = o.created_by
      WHERE o.bataillon_id = ?
      ORDER BY FIELD(o.statut, 'en_cours', 'termine', 'annule'), o.created_at DESC
    `, [req.params.id])

    // Get tasks for each ordre
    for (const o of ordres) {
      o.taches = await query(`
        SELECT t.*, u.username AS completed_by_nom
        FROM bataillon_ordre_taches t
        LEFT JOIN users u ON u.id = t.completed_by
        WHERE t.ordre_id = ?
        ORDER BY t.id
      `, [o.id])
    }

    res.json({ success: true, data: ordres })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// POST /api/bataillons/:id/ordres — create ordre with tasks
router.post('/:id/ordres', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isEtatMajor) return res.status(403).json({ success: false, message: 'Reserve aux officiers' })
    const { titre, description, priorite, taches } = req.body
    const [result] = await pool.execute(
      'INSERT INTO bataillon_ordres (bataillon_id, titre, description, priorite, created_by) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, titre, description || null, priorite || 'normale', req.user.id]
    )
    if (Array.isArray(taches)) {
      for (const t of taches) {
        if (t.description?.trim()) {
          await pool.execute('INSERT INTO bataillon_ordre_taches (ordre_id, description) VALUES (?, ?)', [result.insertId, t.description.trim()])
        }
      }
    }
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// PUT /api/bataillons/ordres/taches/:tacheId/toggle — toggle task completion (member only)
router.put('/ordres/taches/:tacheId/toggle', auth, async (req, res) => {
  try {
    const tache = await queryOne('SELECT t.*, o.bataillon_id FROM bataillon_ordre_taches t JOIN bataillon_ordres o ON o.id = t.ordre_id WHERE t.id = ?', [req.params.tacheId])
    if (!tache) return res.status(404).json({ success: false, message: 'Tache introuvable' })

    const allowed = await isMemberOrPrivileged(req.user.id, tache.bataillon_id, req.user)
    if (!allowed) return res.status(403).json({ success: false, message: 'Acces reserve aux membres' })

    if (tache.completed) {
      await pool.execute('UPDATE bataillon_ordre_taches SET completed = 0, completed_by = NULL, completed_at = NULL WHERE id = ?', [req.params.tacheId])
    } else {
      await pool.execute('UPDATE bataillon_ordre_taches SET completed = 1, completed_by = ?, completed_at = NOW() WHERE id = ?', [req.user.id, req.params.tacheId])
    }
    // Auto-complete ordre if all tasks done
    const ordre = await queryOne(`
      SELECT o.id, 
        (SELECT COUNT(*) FROM bataillon_ordre_taches WHERE ordre_id = o.id) AS total,
        (SELECT COUNT(*) FROM bataillon_ordre_taches WHERE ordre_id = o.id AND completed = 1) AS done
      FROM bataillon_ordres o
      JOIN bataillon_ordre_taches t ON t.ordre_id = o.id
      WHERE t.id = ?
    `, [req.params.tacheId])
    if (ordre && ordre.total > 0 && ordre.total === ordre.done) {
      await pool.execute("UPDATE bataillon_ordres SET statut = 'termine' WHERE id = ?", [ordre.id])
    } else if (ordre) {
      await pool.execute("UPDATE bataillon_ordres SET statut = 'en_cours' WHERE id = ?", [ordre.id])
    }
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// PUT /api/bataillons/ordres/:ordreId/statut — update ordre status
router.put('/ordres/:ordreId/statut', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isEtatMajor) return res.status(403).json({ success: false, message: 'Non autorise' })
    const { statut } = req.body
    await pool.execute('UPDATE bataillon_ordres SET statut = ? WHERE id = ?', [statut, req.params.ordreId])
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// ==================== DISCUSSION (restricted) ====================

// GET /api/bataillons/:id/messages
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const allowed = await isMemberOrPrivileged(req.user.id, req.params.id, req.user)
    if (!allowed) return res.status(403).json({ success: false, message: 'Acces reserve aux membres' })

    const limit = Math.min(parseInt(req.query.limit) || 50, 200)
    const messages = await query(`
      SELECT m.*, u.username, u.nom AS user_nom, u.prenom AS user_prenom,
        e.nom AS eff_nom, e.prenom AS eff_prenom, g.nom_complet AS grade_nom
      FROM bataillon_messages m
      JOIN users u ON u.id = m.auteur_id
      LEFT JOIN effectifs e ON e.id = u.effectif_id
      LEFT JOIN grades g ON g.id = e.grade_id
      WHERE m.bataillon_id = ?
      ORDER BY m.created_at DESC LIMIT ?
    `, [req.params.id, limit])
    res.json({ success: true, data: messages.reverse() })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// POST /api/bataillons/:id/messages (member only)
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const allowed = await isMemberOrPrivileged(req.user.id, req.params.id, req.user)
    if (!allowed) return res.status(403).json({ success: false, message: 'Acces reserve aux membres' })

    const { contenu } = req.body
    if (!contenu?.trim()) return res.status(400).json({ success: false, message: 'Message vide' })
    await pool.execute('INSERT INTO bataillon_messages (bataillon_id, auteur_id, contenu) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, contenu.trim()])
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// ==================== MEDIA (restricted) ====================

// GET /api/bataillons/:id/media
router.get('/:id/media', auth, async (req, res) => {
  try {
    const allowed = await isMemberOrPrivileged(req.user.id, req.params.id, req.user)
    if (!allowed) return res.status(403).json({ success: false, message: 'Acces reserve aux membres' })

    const media = await query(`
      SELECT m.*, u.username AS uploaded_by_nom
      FROM bataillon_media m
      LEFT JOIN users u ON u.id = m.uploaded_by
      WHERE m.bataillon_id = ?
      ORDER BY m.created_at DESC
    `, [req.params.id])
    res.json({ success: true, data: media })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// POST /api/bataillons/:id/media
router.post('/:id/media', auth, async (req, res) => {
  try {
    const allowed = await isMemberOrPrivileged(req.user.id, req.params.id, req.user)
    if (!allowed) return res.status(403).json({ success: false, message: 'Acces reserve aux membres' })

    const { url, titre, type } = req.body
    if (!url) return res.status(400).json({ success: false, message: 'URL requise' })
    await pool.execute('INSERT INTO bataillon_media (bataillon_id, type, url, titre, uploaded_by) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, type || 'photo', url, titre || null, req.user.id])
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// DELETE /api/bataillons/media/:mediaId
router.delete('/media/:mediaId', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) return res.status(403).json({ success: false, message: 'Non autorise' })
    await pool.execute('DELETE FROM bataillon_media WHERE id = ?', [req.params.mediaId])
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// ==================== BATAILLON DU MOIS ====================

// POST /api/bataillons/du-mois — set bataillon du mois
router.post('/du-mois', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isEtatMajor) return res.status(403).json({ success: false, message: 'Reserve a l\'Etat-Major' })
    const { bataillon_id, mois, motif } = req.body
    await pool.execute(
      'INSERT INTO bataillon_du_mois (bataillon_id, mois, motif, decerne_par) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE bataillon_id = VALUES(bataillon_id), motif = VALUES(motif), decerne_par = VALUES(decerne_par)',
      [bataillon_id, mois, motif || null, req.user.id]
    )
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// PUT /api/bataillons/:id — update bataillon (chef, description)
router.put('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isEtatMajor) return res.status(403).json({ success: false, message: 'Non autorise' })
    const { chef_effectif_id, description, couleur } = req.body
    const sets = []
    const params = []
    if (chef_effectif_id !== undefined) { sets.push('chef_effectif_id = ?'); params.push(chef_effectif_id || null) }
    if (description !== undefined) { sets.push('description = ?'); params.push(description) }
    if (couleur !== undefined) { sets.push('couleur = ?'); params.push(couleur) }
    if (sets.length === 0) return res.status(400).json({ success: false, message: 'Rien a modifier' })
    params.push(req.params.id)
    await pool.execute(`UPDATE bataillons SET ${sets.join(', ')} WHERE id = ?`, params)
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

module.exports = router
