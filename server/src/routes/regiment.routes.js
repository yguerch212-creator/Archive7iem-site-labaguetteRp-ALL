const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { logActivity } = require('../utils/logger')
const { resolvePermissions } = require('../utils/permissions')

// GET /api/regiment/effectifs — Effectifs of user's regiment (or all if admin/EM)
router.get('/effectifs', auth, async (req, res) => {
  try {
    const perms = await resolvePermissions(req.user.id)
    const canAll = perms.global.administrator || perms.global.manage_all_effectifs
    const canRegiment = perms.global.manage_regiment_effectifs

    if (!canAll && !canRegiment) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante' })
    }

    const uniteFilter = canAll ? '' : 'WHERE e.unite_id = ?'
    const params = canAll ? [] : [req.user.unite_id]

    const rows = await query(`
      SELECT e.id, e.nom, e.prenom, e.member_status, e.actif,
             g.nom_complet AS grade_nom, g.rang AS grade_rang,
             u.nom AS unite_nom, u.id AS unite_id, u.code AS unite_code,
             us.id AS user_id, us.active AS user_active, us.username
      FROM effectifs e
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      LEFT JOIN users us ON us.effectif_id = e.id
      ${uniteFilter}
      ORDER BY g.rang DESC, e.nom
    `, params)

    res.json({ success: true, data: rows })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// POST /api/regiment/transfer — Transfer an effectif
router.post('/transfer', auth, async (req, res) => {
  try {
    const perms = await resolvePermissions(req.user.id)
    const canAll = perms.global.administrator || perms.global.manage_all_effectifs
    const canRegiment = perms.global.manage_regiment_effectifs

    if (!canAll && !canRegiment) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante' })
    }

    const { effectif_id, to_unite_id, motif } = req.body
    if (!effectif_id || !to_unite_id || !motif || motif.length < 10) {
      return res.status(400).json({ success: false, message: 'Effectif, unité de destination et motif (min 10 car.) requis' })
    }

    const effectif = await queryOne('SELECT * FROM effectifs WHERE id = ?', [effectif_id])
    if (!effectif) return res.status(404).json({ success: false, message: 'Effectif introuvable' })

    // Check regiment scope
    if (!canAll && effectif.unite_id !== req.user.unite_id) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez gérer que les effectifs de votre régiment' })
    }

    if (effectif.unite_id === to_unite_id) {
      return res.status(400).json({ success: false, message: 'L\'effectif est déjà dans cette unité' })
    }

    const toUnite = await queryOne('SELECT * FROM unites WHERE id = ?', [to_unite_id])
    if (!toUnite) return res.status(404).json({ success: false, message: 'Unité de destination introuvable' })

    // Admin/EM = direct transfer, Officier = pending validation
    const needsValidation = !canAll
    const status = needsValidation ? 'pending' : 'approved'

    const [result] = await pool.execute(
      'INSERT INTO effectif_transfers (effectif_id, user_id, from_unite_id, to_unite_id, motif, decided_by, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [effectif_id, effectif.user_id || null, effectif.unite_id, to_unite_id, motif, req.user.id, status]
    )

    if (!needsValidation) {
      // Execute transfer immediately
      await pool.execute('UPDATE effectifs SET unite_id = ? WHERE id = ?', [to_unite_id, effectif_id])
      // Also update user's unite_id if linked
      const linkedUser = await queryOne('SELECT id FROM users WHERE effectif_id = ?', [effectif_id])
      if (linkedUser) {
        await pool.execute('UPDATE users SET unite_id = ? WHERE id = ?', [to_unite_id, linkedUser.id])
      }
      await pool.execute('UPDATE effectif_transfers SET resolved_at = NOW(), validated_by = ? WHERE id = ?', [req.user.id, result.insertId])
    }

    const fromUnite = await queryOne('SELECT nom FROM unites WHERE id = ?', [effectif.unite_id])
    logActivity(req, 'effectif_transfer', 'effectif', effectif_id,
      `${effectif.prenom} ${effectif.nom} : ${fromUnite?.nom} → ${toUnite.nom} (${status}) — ${motif}`)

    res.json({
      success: true,
      status,
      message: needsValidation
        ? `Demande de transfert soumise (en attente de validation État-Major)`
        : `${effectif.prenom} ${effectif.nom} transféré vers ${toUnite.nom}`
    })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// GET /api/regiment/transfers — Pending transfers
router.get('/transfers', auth, async (req, res) => {
  try {
    const perms = await resolvePermissions(req.user.id)
    if (!perms.global.administrator && !perms.global.manage_all_effectifs) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante' })
    }

    const rows = await query(`
      SELECT t.*, 
        e.nom AS effectif_nom, e.prenom AS effectif_prenom,
        fu.nom AS from_unite_nom, tu.nom AS to_unite_nom,
        du.username AS decided_by_name, vu.username AS validated_by_name
      FROM effectif_transfers t
      JOIN effectifs e ON e.id = t.effectif_id
      JOIN unites fu ON fu.id = t.from_unite_id
      JOIN unites tu ON tu.id = t.to_unite_id
      JOIN users du ON du.id = t.decided_by
      LEFT JOIN users vu ON vu.id = t.validated_by
      ORDER BY t.status = 'pending' DESC, t.created_at DESC
      LIMIT 50
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// PUT /api/regiment/transfers/:id — Approve/reject a transfer
router.put('/transfers/:id', auth, async (req, res) => {
  try {
    const perms = await resolvePermissions(req.user.id)
    if (!perms.global.administrator && !perms.global.manage_all_effectifs) {
      return res.status(403).json({ success: false, message: 'Seul l\'État-Major ou un administrateur peut valider les transferts' })
    }

    const { action } = req.body // 'approve' or 'reject'
    const transfer = await queryOne('SELECT * FROM effectif_transfers WHERE id = ? AND status = "pending"', [req.params.id])
    if (!transfer) return res.status(404).json({ success: false, message: 'Transfert introuvable ou déjà traité' })

    if (action === 'approve') {
      await pool.execute('UPDATE effectif_transfers SET status = "approved", validated_by = ?, resolved_at = NOW() WHERE id = ?', [req.user.id, transfer.id])
      await pool.execute('UPDATE effectifs SET unite_id = ? WHERE id = ?', [transfer.to_unite_id, transfer.effectif_id])
      const linkedUser = await queryOne('SELECT id FROM users WHERE effectif_id = ?', [transfer.effectif_id])
      if (linkedUser) await pool.execute('UPDATE users SET unite_id = ? WHERE id = ?', [transfer.to_unite_id, linkedUser.id])
    } else {
      await pool.execute('UPDATE effectif_transfers SET status = "rejected", validated_by = ?, resolved_at = NOW() WHERE id = ?', [req.user.id, transfer.id])
    }

    logActivity(req, `transfer_${action}`, 'effectif', transfer.effectif_id, `Transfert ${action === 'approve' ? 'approuvé' : 'rejeté'}`)
    res.json({ success: true, message: `Transfert ${action === 'approve' ? 'approuvé' : 'rejeté'}` })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// POST /api/regiment/dismiss — Dismiss an effectif
router.post('/dismiss', auth, async (req, res) => {
  try {
    const perms = await resolvePermissions(req.user.id)
    const canAll = perms.global.administrator || perms.global.manage_all_effectifs
    const canRegiment = perms.global.manage_regiment_effectifs

    if (!canAll && !canRegiment) {
      return res.status(403).json({ success: false, message: 'Permission insuffisante' })
    }

    const { effectif_id, motif, severity } = req.body
    if (!effectif_id || !motif || motif.length < 10) {
      return res.status(400).json({ success: false, message: 'Effectif et motif (min 10 car.) requis' })
    }

    // Only admin/EM can do definitive dismissal
    const sev = (severity === 'definitive' && canAll) ? 'definitive' : 'simple'

    const effectif = await queryOne('SELECT * FROM effectifs WHERE id = ?', [effectif_id])
    if (!effectif) return res.status(404).json({ success: false, message: 'Effectif introuvable' })

    if (!canAll && effectif.unite_id !== req.user.unite_id) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez gérer que les effectifs de votre régiment' })
    }

    // Create dismissal record
    const [result] = await pool.execute(
      'INSERT INTO effectif_dismissals (effectif_id, user_id, motif, severity, decided_by, unite_id) VALUES (?, ?, ?, ?, ?, ?)',
      [effectif_id, null, motif, sev, req.user.id, effectif.unite_id]
    )

    // Mark effectif as dismissed
    await pool.execute('UPDATE effectifs SET member_status = "dismissed" WHERE id = ?', [effectif_id])

    // Deactivate user account if exists
    const linkedUser = await queryOne('SELECT id FROM users WHERE effectif_id = ?', [effectif_id])
    if (linkedUser) {
      const deciderName = `${req.user.prenom || ''} ${req.user.nom || req.user.username}`.trim()
      await pool.execute(
        'UPDATE users SET active = 0, dismissed_at = NOW(), dismissal_id = ?, dismissal_motif = ?, dismissed_by_name = ? WHERE id = ?',
        [result.insertId, motif, deciderName, linkedUser.id]
      )
      // Update dismissal record with user_id
      await pool.execute('UPDATE effectif_dismissals SET user_id = ? WHERE id = ?', [linkedUser.id, result.insertId])
    }

    logActivity(req, 'effectif_dismiss', 'effectif', effectif_id,
      `${effectif.prenom} ${effectif.nom} renvoyé (${sev}) — ${motif}`)

    res.json({ success: true, message: `${effectif.prenom} ${effectif.nom} a été relevé de ses fonctions` })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// GET /api/regiment/dismissals — Dismissal history
router.get('/dismissals', auth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT d.*, e.nom AS effectif_nom, e.prenom AS effectif_prenom,
        u.nom AS unite_nom, du.username AS decided_by_name
      FROM effectif_dismissals d
      JOIN effectifs e ON e.id = d.effectif_id
      JOIN unites u ON u.id = d.unite_id
      JOIN users du ON du.id = d.decided_by
      ORDER BY d.created_at DESC LIMIT 50
    `)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// POST /api/regiment/reinstate/:effectifId — Reinstate a dismissed effectif
router.post('/reinstate/:effectifId', auth, async (req, res) => {
  try {
    const perms = await resolvePermissions(req.user.id)
    if (!perms.global.administrator && !perms.global.manage_all_effectifs) {
      return res.status(403).json({ success: false, message: 'Seul l\'État-Major ou un administrateur peut réintégrer un effectif' })
    }

    const effectif = await queryOne('SELECT * FROM effectifs WHERE id = ?', [req.params.effectifId])
    if (!effectif) return res.status(404).json({ success: false, message: 'Effectif introuvable' })

    await pool.execute('UPDATE effectifs SET member_status = "active" WHERE id = ?', [effectif.id])
    const linkedUser = await queryOne('SELECT id FROM users WHERE effectif_id = ?', [effectif.id])
    if (linkedUser) {
      await pool.execute('UPDATE users SET active = 1, dismissed_at = NULL, dismissal_id = NULL, dismissal_motif = NULL, dismissed_by_name = NULL WHERE id = ?', [linkedUser.id])
    }

    logActivity(req, 'effectif_reinstate', 'effectif', effectif.id, `${effectif.prenom} ${effectif.nom} réintégré`)
    res.json({ success: true, message: `${effectif.prenom} ${effectif.nom} a été réintégré` })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

module.exports = router
