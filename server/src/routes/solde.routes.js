const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// Solde par grade (Reichsmark/mois) — données historiques Wehrmacht 1944
const SOLDE_PAR_RANG = {
  // Mannschaften (HDR)
  5:  15.00,   // Schütze/Grenadier
  10: 15.00,   // Oberschütze
  15: 23.00,   // Gefreiter
  20: 27.00,   // Obergefreiter
  25: 30.00,   // Stabsgefreiter
  // Unteroffiziere (SO)
  35: 31.00,   // Unteroffizier
  40: 38.00,   // Unterfeldwebel
  45: 45.00,   // Feldwebel
  50: 56.00,   // Oberfeldwebel
  55: 65.00,   // Stabsfeldwebel
  // Offiziere
  60: 180.00,  // Leutnant
  65: 230.00,  // Oberleutnant
  70: 290.00,  // Hauptmann
  75: 380.00,  // Major
  80: 480.00,  // Oberstleutnant
  85: 600.00,  // Oberst
  90: 800.00,  // Generalmajor
  95: 1000.00, // Generalleutnant
  100: 1400.00 // General
}

// GET /api/solde/:effectifId — Historique solde
router.get('/:effectifId', optionalAuth, async (req, res) => {
  try {
    const solde = await query(
      'SELECT * FROM solde_effectifs WHERE effectif_id = ? ORDER BY date_operation DESC LIMIT 200',
      [req.params.effectifId]
    )
    // Calcul balance
    const balRow = await queryOne(
      `SELECT COALESCE(SUM(CASE WHEN type_operation='credit' THEN montant ELSE -montant END), 0) as balance
       FROM solde_effectifs WHERE effectif_id = ?`,
      [req.params.effectifId]
    )
    res.json({ success: true, data: { operations: solde, balance: parseFloat(balRow.balance) || 0 } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/solde/:effectifId/credit — Ajouter solde manuellement (officier/admin)
router.post('/:effectifId/credit', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isRecenseur)
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    const { montant, motif } = req.body
    if (!montant || montant <= 0) return res.status(400).json({ success: false, message: 'Montant invalide' })
    await pool.execute(
      'INSERT INTO solde_effectifs (effectif_id, montant, motif, type_operation, created_by) VALUES (?, ?, ?, ?, ?)',
      [req.params.effectifId, montant, motif || 'Crédit manuel', 'credit', req.user.id]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/solde/:effectifId/debit — Retrait (officier/admin)
router.post('/:effectifId/debit', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isRecenseur)
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    const { montant, motif } = req.body
    if (!montant || montant <= 0) return res.status(400).json({ success: false, message: 'Montant invalide' })
    await pool.execute(
      'INSERT INTO solde_effectifs (effectif_id, montant, motif, type_operation, created_by) VALUES (?, ?, ?, ?, ?)',
      [req.params.effectifId, montant, motif || 'Débit', 'debit', req.user.id]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/solde/auto-payday — Auto-pay all effectifs (called by cron or manually)
router.post('/auto-payday', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: 'Admin only' })
    const effectifs = await query('SELECT id, grade_id FROM effectifs WHERE actif = 1')
    const grades = await query('SELECT id, rang FROM grades')
    const gradeMap = {}
    grades.forEach(g => { gradeMap[g.id] = g.rang })
    let count = 0
    for (const eff of effectifs) {
      const rang = gradeMap[eff.grade_id] || 5
      // Find closest rang in SOLDE_PAR_RANG
      const keys = Object.keys(SOLDE_PAR_RANG).map(Number).sort((a, b) => a - b)
      let solde = 15
      for (const k of keys) { if (rang >= k) solde = SOLDE_PAR_RANG[k] }
      await pool.execute(
        'INSERT INTO solde_effectifs (effectif_id, montant, motif, type_operation, created_by) VALUES (?, ?, ?, ?, ?)',
        [eff.id, solde, 'Wehrsold — Solde hebdomadaire', 'credit', req.user.id]
      )
      count++
    }
    res.json({ success: true, message: `Solde versée à ${count} effectifs` })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/solde/grille — Grille de solde par grade
router.get('/grille/all', optionalAuth, async (req, res) => {
  try {
    const grades = await query('SELECT id, nom_complet, rang FROM grades ORDER BY rang')
    const grille = grades.map(g => {
      const keys = Object.keys(SOLDE_PAR_RANG).map(Number).sort((a, b) => a - b)
      let solde = 15
      for (const k of keys) { if (g.rang >= k) solde = SOLDE_PAR_RANG[k] }
      return { grade: g.nom_complet, rang: g.rang, solde }
    })
    res.json({ success: true, data: grille })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// === CRON AUTO-PAYDAY : Tous les vendredis à 20h (UTC+1 = 19h UTC) ===
const cron = require('node-cron')
cron.schedule('0 19 * * 5', async () => {
  console.log('[SOLDE] Auto-payday déclenché (vendredi 20h)')
  try {
    const effectifs = await query('SELECT id, grade_id FROM effectifs WHERE actif = 1')
    const grades = await query('SELECT id, rang FROM grades')
    const gradeMap = {}
    grades.forEach(g => { gradeMap[g.id] = g.rang })
    let count = 0
    for (const eff of effectifs) {
      const rang = gradeMap[eff.grade_id] || 5
      const keys = Object.keys(SOLDE_PAR_RANG).map(Number).sort((a, b) => a - b)
      let solde = 15
      for (const k of keys) { if (rang >= k) solde = SOLDE_PAR_RANG[k] }
      await pool.execute(
        'INSERT INTO solde_effectifs (effectif_id, montant, motif, type_operation, created_by) VALUES (?, ?, ?, ?, ?)',
        [eff.id, solde, 'Wehrsold — Solde hebdomadaire (auto)', 'credit', 1]
      )
      count++
    }
    console.log(`[SOLDE] Solde versée à ${count} effectifs`)
  } catch (err) { console.error('[SOLDE] Erreur auto-payday:', err.message) }
}, { timezone: 'Europe/Paris' })

module.exports = router
