const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// GET /api/journal — list all published articles (+ own drafts if logged in)
router.get('/', optionalAuth, async (req, res) => {
  try {
    let rows
    if (req.user?.isGuest || !req.user?.id) {
      rows = await query(`
        SELECT j.*, e.prenom AS auteur_prenom, e.nom AS auteur_nom, g.nom_complet AS auteur_grade,
               u.code AS auteur_unite, v.prenom AS valideur_prenom, v.nom AS valideur_nom
        FROM journal_articles j
        LEFT JOIN effectifs e ON e.id = j.auteur_id
        LEFT JOIN grades g ON g.id = e.grade_id
        LEFT JOIN unites u ON u.id = e.unite_id
        LEFT JOIN effectifs v ON v.id = j.valide_par
        WHERE j.statut = 'publie'
        ORDER BY j.created_at DESC
      `)
    } else {
      rows = await query(`
        SELECT j.*, e.prenom AS auteur_prenom, e.nom AS auteur_nom, g.nom_complet AS auteur_grade,
               u.code AS auteur_unite, v.prenom AS valideur_prenom, v.nom AS valideur_nom
        FROM journal_articles j
        LEFT JOIN effectifs e ON e.id = j.auteur_id
        LEFT JOIN grades g ON g.id = e.grade_id
        LEFT JOIN unites u ON u.id = e.unite_id
        LEFT JOIN effectifs v ON v.id = j.valide_par
        WHERE j.statut = 'publie' OR j.auteur_id = ?
        ORDER BY j.created_at DESC
      `, [req.user.effectif_id])
    }
    res.json({ success: true, data: rows })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/journal/pending — articles pending validation (officiers+)
router.get('/pending', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isEtatMajor && !req.user.isOfficier) {
      // Sous-officiers can validate HDR articles
      if (!req.user.grade_rang || req.user.grade_rang < 35) return res.status(403).json({ error: 'Non autorisé' })
    }
    const rows = await query(`
      SELECT j.*, e.prenom AS auteur_prenom, e.nom AS auteur_nom, g.nom_complet AS auteur_grade, g.rang AS auteur_rang,
             u.code AS auteur_unite
      FROM journal_articles j
      LEFT JOIN effectifs e ON e.id = j.auteur_id
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      WHERE j.statut = 'en_attente'
      ORDER BY j.created_at ASC
    `)
    // Filter: SO can only validate HDR articles, OFF can validate HDR+SO
    const filtered = rows.filter(r => {
      if (req.user.isAdmin || req.user.isEtatMajor) return true
      if (req.user.isOfficier) return true // OFF validates everything
      // SO validates HDR only (auteur_rang < 35)
      return (r.auteur_rang || 0) < 35
    })
    res.json({ success: true, data: filtered })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/journal/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const j = await queryOne(`
      SELECT j.*, e.prenom AS auteur_prenom, e.nom AS auteur_nom, g.nom_complet AS auteur_grade,
             u.code AS auteur_unite, u.nom AS auteur_unite_nom,
             v.prenom AS valideur_prenom, v.nom AS valideur_nom
      FROM journal_articles j
      LEFT JOIN effectifs e ON e.id = j.auteur_id
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      LEFT JOIN effectifs v ON v.id = j.valide_par
      WHERE j.id = ?
    `, [req.params.id])
    if (!j) return res.status(404).json({ success: false, message: 'Article introuvable' })
    res.json({ success: true, data: j })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/journal — create article
router.post('/', auth, async (req, res) => {
  try {
    if (!req.user.effectif_id) return res.status(403).json({ error: 'Effectif requis' })
    const { titre, sous_titre, contenu } = req.body
    if (!titre) return res.status(400).json({ error: 'Titre requis' })

    const [result] = await pool.execute(
      'INSERT INTO journal_articles (titre, sous_titre, auteur_id, auteur_nom, contenu, statut) VALUES (?,?,?,?,?,?)',
      [titre, sous_titre || null, req.user.effectif_id, `${req.user.prenom || ''} ${req.user.nom || ''}`.trim(), contenu || '', 'brouillon']
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/journal/:id — update article (author only while draft/refused)
router.put('/:id', auth, async (req, res) => {
  try {
    const article = await queryOne('SELECT * FROM journal_articles WHERE id = ?', [req.params.id])
    if (!article) return res.status(404).json({ error: 'Article introuvable' })
    if (article.auteur_id !== req.user.effectif_id && !req.user.isAdmin && !req.user.isEtatMajor) {
      return res.status(403).json({ error: 'Non autorisé' })
    }
    if (article.statut === 'publie' && !req.user.isAdmin && !req.user.isEtatMajor) {
      return res.status(403).json({ error: 'Article déjà publié' })
    }
    const { titre, sous_titre, contenu } = req.body
    await pool.execute('UPDATE journal_articles SET titre=?, sous_titre=?, contenu=? WHERE id=?',
      [titre || article.titre, sous_titre ?? article.sous_titre, contenu ?? article.contenu, req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/journal/:id/layout — save layout
router.put('/:id/layout', auth, async (req, res) => {
  try {
    const article = await queryOne('SELECT * FROM journal_articles WHERE id = ?', [req.params.id])
    if (!article) return res.status(404).json({ error: 'Article introuvable' })
    if (article.auteur_id !== req.user.effectif_id && !req.user.isAdmin && !req.user.isEtatMajor) {
      return res.status(403).json({ error: 'Non autorisé' })
    }
    const { layout } = req.body
    await pool.execute('UPDATE journal_articles SET layout=? WHERE id=?', [JSON.stringify(layout), req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/journal/:id/submit — submit for validation
router.put('/:id/submit', auth, async (req, res) => {
  try {
    const article = await queryOne('SELECT * FROM journal_articles WHERE id = ?', [req.params.id])
    if (!article) return res.status(404).json({ error: 'Article introuvable' })
    if (article.auteur_id !== req.user.effectif_id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Non autorisé' })
    }
    
    // Officiers auto-publish
    if (req.user.isOfficier || req.user.isAdmin || req.user.isEtatMajor) {
      await pool.execute('UPDATE journal_articles SET statut=?, valide_par=?, valide_at=NOW(), date_publication=NOW() WHERE id=?',
        ['publie', req.user.effectif_id, req.params.id])
      return res.json({ success: true, autoPublished: true })
    }
    
    await pool.execute('UPDATE journal_articles SET statut=? WHERE id=?', ['en_attente', req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/journal/:id/validate — validate article
router.put('/:id/validate', auth, async (req, res) => {
  try {
    const article = await queryOne(`
      SELECT j.*, g.rang AS auteur_rang FROM journal_articles j
      LEFT JOIN effectifs e ON e.id = j.auteur_id
      LEFT JOIN grades g ON g.id = e.grade_id
      WHERE j.id = ?
    `, [req.params.id])
    if (!article) return res.status(404).json({ error: 'Article introuvable' })
    
    // Check permission hierarchy
    const canValidate = req.user.isAdmin || req.user.isEtatMajor || req.user.isOfficier ||
      (req.user.grade_rang >= 35 && (article.auteur_rang || 0) < 35) // SO validates HDR
    if (!canValidate) return res.status(403).json({ error: 'Non autorisé' })
    
    const { action } = req.body // 'approve' or 'refuse'
    if (action === 'approve') {
      await pool.execute('UPDATE journal_articles SET statut=?, valide_par=?, valide_at=NOW(), date_publication=NOW() WHERE id=?',
        ['publie', req.user.effectif_id, req.params.id])
    } else {
      await pool.execute('UPDATE journal_articles SET statut=? WHERE id=?', ['refuse', req.params.id])
    }
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// DELETE /api/journal/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const article = await queryOne('SELECT * FROM journal_articles WHERE id = ?', [req.params.id])
    if (!article) return res.status(404).json({ error: 'Introuvable' })
    if (article.auteur_id !== req.user.effectif_id && !req.user.isAdmin && !req.user.isEtatMajor) {
      return res.status(403).json({ error: 'Non autorisé' })
    }
    await pool.execute('DELETE FROM journal_articles WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
