const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// GET /api/gazette — list all
router.get('/', optionalAuth, async (req, res) => {
  try {
    const rows = await query('SELECT id, numero, semaine, titre, published, created_at FROM gazettes ORDER BY numero DESC')
    res.json({ success: true, data: rows })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// GET /api/gazette/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const g = await queryOne('SELECT * FROM gazettes WHERE id = ?', [req.params.id])
    if (!g) return res.status(404).json({ success: false, message: 'Gazette introuvable' })
    res.json({ success: true, data: g })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// GET /api/gazette/generate/preview — Auto-generate content from this week's data
router.get('/generate/preview', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) return res.status(403).json({ error: 'Non autorisé' })
    
    const rapports = await query("SELECT type, titre, auteur_nom, auteur_grade FROM rapports WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY created_at DESC")
    const nouveaux = await query("SELECT e.prenom, e.nom, g.nom_complet AS grade, u.code AS unite FROM effectifs e LEFT JOIN grades g ON g.id = e.grade_id LEFT JOIN unites u ON u.id = e.unite_id WHERE e.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
    const decorations = await query("SELECT ed.motif, e.prenom, e.nom, d.nom AS decoration FROM effectif_decorations ed JOIN effectifs e ON e.id = ed.effectif_id JOIN decorations d ON d.id = ed.decoration_id WHERE ed.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
    const affaires = await query("SELECT numero, titre, statut FROM affaires WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
    const pds = await queryOne("SELECT COUNT(DISTINCT effectif_id) as c, AVG(total_heures) as avg_h FROM pds_semaines WHERE semaine = (SELECT MAX(semaine) FROM pds_semaines)")
    const interdits = await query("SELECT COUNT(*) as c FROM interdits_front WHERE actif = 1")
    
    // Build gazette content
    const now = new Date()
    const weekNum = Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / (7 * 86400000))
    let contenu = `GAZETTE DU 7. ARMEEKORPS — SEMAINE ${weekNum}\n`
    contenu += `═══════════════════════════════════════\n\n`
    
    if (nouveaux.length > 0) {
      contenu += `📋 NOUVEAUX EFFECTIFS (${nouveaux.length})\n`
      nouveaux.forEach(n => { contenu += `  • ${n.grade || ''} ${n.prenom} ${n.nom} — ${n.unite || '?'}\n` })
      contenu += `\n`
    }
    
    if (decorations.length > 0) {
      contenu += `🎖️ DÉCORATIONS\n`
      decorations.forEach(d => { contenu += `  • ${d.prenom} ${d.nom} — ${d.decoration} (${d.motif || ''})\n` })
      contenu += `\n`
    }
    
    if (rapports.length > 0) {
      contenu += `📝 RAPPORTS DE LA SEMAINE (${rapports.length})\n`
      rapports.forEach(r => { contenu += `  • [${r.type}] ${r.titre} — ${r.auteur_grade || ''} ${r.auteur_nom || ''}\n` })
      contenu += `\n`
    }
    
    if (affaires.length > 0) {
      contenu += `⚖️ AFFAIRES JUDICIAIRES\n`
      affaires.forEach(a => { contenu += `  • ${a.numero} — ${a.titre} (${a.statut})\n` })
      contenu += `\n`
    }
    
    contenu += `⏱️ PRISE DE SERVICE\n`
    contenu += `  • ${pds?.c || 0} effectifs enregistrés — Moyenne: ${pds?.avg_h ? pds.avg_h.toFixed(1) : '0'}h\n`
    contenu += `  • ${interdits[0]?.c || 0} interdit(s) de front actif(s)\n\n`
    
    contenu += `═══════════════════════════════════════\n`
    contenu += `Publié par les Archives du 7. Armeekorps`
    
    const lastGazette = await queryOne('SELECT MAX(numero) as n FROM gazettes')
    const nextNum = (lastGazette?.n || 0) + 1
    
    res.json({ success: true, numero: nextNum, semaine: `S${weekNum}-${now.getFullYear()}`, contenu })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// POST /api/gazette — Create/publish
router.post('/', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier) return res.status(403).json({ error: 'Non autorisé' })
    const { numero, semaine, titre, contenu, published } = req.body
    const [result] = await pool.execute(
      'INSERT INTO gazettes (numero, semaine, titre, contenu, published) VALUES (?,?,?,?,?)',
      [numero, semaine || null, titre || `Gazette N°${numero}`, contenu, published ? 1 : 0]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// DELETE /api/gazette/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin uniquement' })
    await pool.execute('DELETE FROM gazettes WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

module.exports = router
