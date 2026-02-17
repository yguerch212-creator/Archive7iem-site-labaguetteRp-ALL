const router = require('express').Router()
const { query, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

const fmtDate = (d) => {
  if (!d) return null
  try { const dt = new Date(d); return isNaN(dt) ? d : dt.toISOString().slice(0, 10) } catch { return d }
}

// ==================== HOSPITALISATIONS ====================

router.get('/hospitalisations', optionalAuth, async (req, res) => {
  try {
    const { effectif_id } = req.query
    let sql = `SELECT h.*, COALESCE(CONCAT(e.prenom,' ',e.nom), h.effectif_nom_libre) AS effectif_nom, CONCAT(m.prenom,' ',m.nom) AS medecin_effectif_nom
      FROM hospitalisations h
      LEFT JOIN effectifs e ON e.id = h.effectif_id
      LEFT JOIN effectifs m ON m.id = h.medecin_id
      WHERE 1=1`
    const params = []
    if (effectif_id) { sql += ' AND h.effectif_id = ?'; params.push(effectif_id) }
    sql += ' ORDER BY h.date_entree DESC'
    res.json({ success: true, data: await query(sql, params) })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.post('/hospitalisations', auth, async (req, res) => {
  try {
    const { effectif_id, effectif_nom_libre, date_entree, date_sortie, etablissement, motif, diagnostic, traitement, medecin_id, medecin_nom, notes } = req.body
    if ((!effectif_id && !effectif_nom_libre) || !date_entree || !etablissement || !motif) {
      return res.status(400).json({ success: false, message: 'Effectif (ou nom), date, établissement et motif requis' })
    }
    const [result] = await pool.execute(
      `INSERT INTO hospitalisations (effectif_id, effectif_nom_libre, date_entree, date_sortie, etablissement, motif, diagnostic, traitement, medecin_id, medecin_nom, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [effectif_id || null, effectif_nom_libre || null, fmtDate(date_entree), fmtDate(date_sortie) || null, etablissement, motif, diagnostic || null, traitement || null, medecin_id || null, medecin_nom || null, notes || null, req.user.id]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/hospitalisations/:id', auth, async (req, res) => {
  try { await pool.execute('DELETE FROM hospitalisations WHERE id = ?', [req.params.id]); res.json({ success: true }) }
  catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// ==================== VACCINATIONS ====================

router.get('/vaccinations', optionalAuth, async (req, res) => {
  try {
    const { effectif_id } = req.query
    let sql = `SELECT v.*, COALESCE(CONCAT(e.prenom,' ',e.nom), v.effectif_nom_libre) AS effectif_nom
      FROM vaccinations v LEFT JOIN effectifs e ON e.id = v.effectif_id WHERE 1=1`
    const params = []
    if (effectif_id) { sql += ' AND v.effectif_id = ?'; params.push(effectif_id) }
    sql += ' ORDER BY v.date_vaccination DESC'
    res.json({ success: true, data: await query(sql, params) })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.post('/vaccinations', auth, async (req, res) => {
  try {
    const { effectif_id, effectif_nom_libre, type_vaccin, date_vaccination, date_rappel, medecin_id, medecin_nom, lot, notes } = req.body
    if ((!effectif_id && !effectif_nom_libre) || !type_vaccin || !date_vaccination) {
      return res.status(400).json({ success: false, message: 'Effectif (ou nom), type et date requis' })
    }
    const [result] = await pool.execute(
      `INSERT INTO vaccinations (effectif_id, effectif_nom_libre, type_vaccin, date_vaccination, date_rappel, medecin_id, medecin_nom, lot, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [effectif_id || null, effectif_nom_libre || null, type_vaccin, fmtDate(date_vaccination), fmtDate(date_rappel) || null, medecin_id || null, medecin_nom || null, lot || null, notes || null, req.user.id]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/vaccinations/:id', auth, async (req, res) => {
  try { await pool.execute('DELETE FROM vaccinations WHERE id = ?', [req.params.id]); res.json({ success: true }) }
  catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// ==================== BLESSURES ====================

router.get('/blessures', optionalAuth, async (req, res) => {
  try {
    const { effectif_id } = req.query
    let sql = `SELECT b.*, COALESCE(CONCAT(e.prenom,' ',e.nom), b.effectif_nom_libre) AS effectif_nom
      FROM blessures b LEFT JOIN effectifs e ON e.id = b.effectif_id WHERE 1=1`
    const params = []
    if (effectif_id) { sql += ' AND b.effectif_id = ?'; params.push(effectif_id) }
    sql += ' ORDER BY b.date_blessure DESC'
    res.json({ success: true, data: await query(sql, params) })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.post('/blessures', auth, async (req, res) => {
  try {
    const { effectif_id, effectif_nom_libre, date_blessure, type_blessure, localisation, circonstances, gravite, sequelles, medecin_id, medecin_nom, notes } = req.body
    if ((!effectif_id && !effectif_nom_libre) || !date_blessure || !type_blessure || !localisation) {
      return res.status(400).json({ success: false, message: 'Effectif (ou nom), date, type et localisation requis' })
    }
    const [result] = await pool.execute(
      `INSERT INTO blessures (effectif_id, effectif_nom_libre, date_blessure, type_blessure, localisation, circonstances, gravite, sequelles, medecin_id, medecin_nom, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [effectif_id || null, effectif_nom_libre || null, fmtDate(date_blessure), type_blessure, localisation, circonstances || null, gravite || 'legere', sequelles || null, medecin_id || null, medecin_nom || null, notes || null, req.user.id]
    )
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/blessures/:id', auth, async (req, res) => {
  try { await pool.execute('DELETE FROM blessures WHERE id = ?', [req.params.id]); res.json({ success: true }) }
  catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// ==================== SYNC: Update effectif physical data ====================

router.put('/sync-physique/:effectifId', auth, async (req, res) => {
  try {
    const { taille_cm, gestalt, blutgruppe, gasmaskengroesse, schuhzeuglaenge } = req.body
    const fields = [], params = []
    if (taille_cm !== undefined) { fields.push('taille_cm = ?'); params.push(taille_cm ? parseInt(String(taille_cm).replace(/\D/g,'')) || null : null) }
    if (gestalt !== undefined) { fields.push('gestalt = ?'); params.push(gestalt || null) }
    if (blutgruppe !== undefined) { fields.push('blutgruppe = ?'); params.push(blutgruppe || null) }
    if (gasmaskengroesse !== undefined) { fields.push('gasmaskengroesse = ?'); params.push(gasmaskengroesse || null) }
    if (schuhzeuglaenge !== undefined) { fields.push('schuhzeuglaenge = ?'); params.push(schuhzeuglaenge || null) }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'Aucun champ' })
    params.push(req.params.effectifId)
    await pool.execute(`UPDATE effectifs SET ${fields.join(', ')} WHERE id = ?`, params)
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

// ==================== AUTO-RECONCILIATION ====================
// Called when a new effectif is created — match nom_libre to effectif_id

router.put('/reconcile/:effectifId', auth, async (req, res) => {
  try {
    const { prenom, nom } = req.body
    if (!prenom || !nom) return res.status(400).json({ success: false, message: 'prenom et nom requis' })
    const fullName = `${prenom} ${nom}`
    const patterns = [fullName, `${nom} ${prenom}`, nom]

    for (const table of ['hospitalisations', 'vaccinations', 'blessures']) {
      for (const pat of patterns) {
        await pool.execute(
          `UPDATE ${table} SET effectif_id = ?, effectif_nom_libre = NULL WHERE effectif_id IS NULL AND effectif_nom_libre LIKE ?`,
          [req.params.effectifId, `%${pat}%`]
        )
      }
    }
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
