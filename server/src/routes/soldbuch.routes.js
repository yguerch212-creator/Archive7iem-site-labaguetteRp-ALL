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

// PUT /api/soldbuch/:effectif_id/sign — Sign a soldbuch slot (soldat or referent)
router.put('/:effectifId/sign', auth, async (req, res) => {
  try {
    const { slot, signature_data } = req.body
    if (!['soldat', 'referent'].includes(slot)) {
      return res.status(400).json({ success: false, message: 'Slot invalide (soldat ou referent)' })
    }
    if (!signature_data) {
      return res.status(400).json({ success: false, message: 'Signature requise' })
    }

    const effectifId = parseInt(req.params.effectifId)
    const isOwner = req.user.effectif_id === effectifId

    // soldat slot: ONLY the effectif themselves (not admin, not administratif)
    // referent slot: ONLY officiers (not admin, not administratif)
    if (slot === 'soldat' && !isOwner) {
      return res.status(403).json({ success: false, message: 'Seul le soldat concerné peut signer son propre Soldbuch' })
    }
    if (slot === 'referent' && !req.user.isOfficier) {
      return res.status(403).json({ success: false, message: 'Seul un officier peut signer en tant que référent' })
    }

    const col = slot === 'soldat' ? 'signature_soldat' : 'signature_referent'
    await pool.execute(`UPDATE effectifs SET ${col} = ? WHERE id = ?`, [signature_data, effectifId])

    res.json({ success: true, message: 'Signature enregistrée' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/soldbuch/:effectif_id/details — Self-service soldbuch details (soldier fills their own)
router.put('/:effectifId/details', auth, async (req, res) => {
  try {
    const effectifId = parseInt(req.params.effectifId)
    const isOwner = req.user.effectif_id === effectifId
    const isPrivileged = req.user.isAdmin || req.user.isRecenseur || req.user.isOfficier

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez modifier que votre propre Soldbuch' })
    }

    const { religion, beruf, gestalt, gesicht, haar, bart, augen, besondere_kennzeichen, schuhzeuglaenge, blutgruppe, gasmaskengroesse, wehrnummer } = req.body

    if (isOwner && !isPrivileged) {
      // Soldier submits → mark as pending validation
      await pool.execute(`UPDATE effectifs SET
        religion = ?, beruf = ?, gestalt = ?, gesicht = ?, haar = ?, bart = ?, augen = ?,
        besondere_kennzeichen = ?, schuhzeuglaenge = ?, blutgruppe = ?, gasmaskengroesse = ?, wehrnummer = ?,
        soldbuch_details_pending = 1
        WHERE id = ?`,
        [religion || null, beruf || null, gestalt || null, gesicht || null, haar || null, bart || null, augen || null,
         besondere_kennzeichen || null, schuhzeuglaenge || null, blutgruppe || null, gasmaskengroesse || null, wehrnummer || null,
         effectifId])
      res.json({ success: true, message: 'Details soumis pour validation', pending: true })
    } else {
      // Privileged user → save directly, clear pending
      await pool.execute(`UPDATE effectifs SET
        religion = ?, beruf = ?, gestalt = ?, gesicht = ?, haar = ?, bart = ?, augen = ?,
        besondere_kennzeichen = ?, schuhzeuglaenge = ?, blutgruppe = ?, gasmaskengroesse = ?, wehrnummer = ?,
        soldbuch_details_pending = 0
        WHERE id = ?`,
        [religion || null, beruf || null, gestalt || null, gesicht || null, haar || null, bart || null, augen || null,
         besondere_kennzeichen || null, schuhzeuglaenge || null, blutgruppe || null, gasmaskengroesse || null, wehrnummer || null,
         effectifId])
      res.json({ success: true, message: 'Details enregistres' })
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/soldbuch/:effectif_id/details/validate — Validate pending details (officier+)
router.put('/:effectifId/details/validate', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isRecenseur && !req.user.isOfficier) {
      return res.status(403).json({ success: false, message: 'Non autorise' })
    }
    await pool.execute('UPDATE effectifs SET soldbuch_details_pending = 0 WHERE id = ?', [req.params.effectifId])
    res.json({ success: true, message: 'Details valides' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/soldbuch/:effectif_id/stamp — Set stamp from bibliothèque
router.put('/:effectifId/stamp', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isRecenseur && !req.user.isOfficier) {
      return res.status(403).json({ success: false, message: 'Seul un officier ou administratif peut apposer le tampon' })
    }
    const { stamp_path } = req.body
    if (!stamp_path) return res.status(400).json({ success: false, message: 'Tampon requis' })
    await pool.execute('UPDATE effectifs SET stamp_path = ? WHERE id = ?', [stamp_path, req.params.effectifId])
    res.json({ success: true, message: 'Tampon apposé' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
