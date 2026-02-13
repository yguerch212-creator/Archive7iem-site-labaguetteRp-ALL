const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

// Auto-number: TEL-YYYY-NNN
async function nextNumero() {
  const year = new Date().getFullYear()
  const row = await queryOne(`SELECT COUNT(*) AS cnt FROM telegrammes WHERE numero LIKE ?`, [`TEL-${year}-%`])
  const seq = (row?.cnt || 0) + 1
  return `TEL-${year}-${String(seq).padStart(3, '0')}`
}

// GET /api/telegrammes — inbox + sent for current user's effectif
router.get('/', optionalAuth, async (req, res) => {
  try {
    const effectifId = req.user.effectif_id
    const tab = req.query.tab || 'recu' // recu, envoye, tous
    const isPrivileged = req.user.isAdmin || req.user.isRecenseur || req.user.isOfficier

    let where = ''
    const params = []
    if (tab === 'recu' && effectifId) {
      where = "WHERE t.destinataire_id = ? AND t.statut != 'Archivé'"
      params.push(effectifId)
    } else if (tab === 'envoye' && effectifId) {
      where = "WHERE t.expediteur_id = ? AND t.statut != 'Archivé'"
      params.push(effectifId)
    } else if (tab === 'archive' && effectifId) {
      where = "WHERE t.statut = 'Archivé' AND (t.destinataire_id = ? OR t.expediteur_id = ?)"
      params.push(effectifId, effectifId)
    } else if (tab === 'tous') {
      where = "WHERE t.statut != 'Archivé'"
    } else if (effectifId) {
      where = 'WHERE t.destinataire_id = ? OR t.expediteur_id = ?'
      params.push(effectifId, effectifId)
    }

    const rows = await query(`
      SELECT t.*,
        exp_e.prenom AS exp_prenom, exp_e.nom AS exp_nom,
        dest_e.prenom AS dest_prenom, dest_e.nom AS dest_nom
      FROM telegrammes t
      LEFT JOIN effectifs exp_e ON exp_e.id = t.expediteur_id
      LEFT JOIN effectifs dest_e ON dest_e.id = t.destinataire_id
      ${where}
      ORDER BY t.created_at DESC
      LIMIT 100
    `, params)

    // Count unread
    let unread = 0
    if (effectifId) {
      const ur = await queryOne(`SELECT COUNT(*) AS cnt FROM telegrammes WHERE destinataire_id = ? AND statut IN ('Envoyé','Reçu')`, [effectifId])
      unread = ur?.cnt || 0
    }

    res.json({ success: true, data: rows, unread })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/telegrammes/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const row = await queryOne(`
      SELECT t.*,
        exp_e.prenom AS exp_prenom, exp_e.nom AS exp_nom,
        dest_e.prenom AS dest_prenom, dest_e.nom AS dest_nom
      FROM telegrammes t
      LEFT JOIN effectifs exp_e ON exp_e.id = t.expediteur_id
      LEFT JOIN effectifs dest_e ON dest_e.id = t.destinataire_id
      WHERE t.id = ?
    `, [req.params.id])
    if (!row) return res.status(404).json({ success: false, message: 'Télégramme introuvable' })

    // Mark as read if recipient
    if (req.user.effectif_id && row.destinataire_id === req.user.effectif_id && row.statut !== 'Lu' && row.statut !== 'Archivé') {
      await pool.execute('UPDATE telegrammes SET statut = "Lu", lu_at = NOW() WHERE id = ?', [req.params.id])
      row.statut = 'Lu'
    }

    res.json({ success: true, data: row })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/telegrammes — send
router.post('/', auth, async (req, res) => {
  try {
    const { destinataire_id, destinataire_nom, destinataire_unite, objet, contenu, priorite } = req.body
    if (!objet || !contenu) return res.status(400).json({ success: false, message: 'Objet et contenu requis' })

    const numero = await nextNumero()

    // Get sender info from effectif
    let expNom = req.user.username, expGrade = null, expUnite = null, expId = null
    if (req.user.effectif_id) {
      const eff = await queryOne(`
        SELECT e.prenom, e.nom, g.nom_complet AS grade_nom, u.code AS unite_code
        FROM effectifs e
        LEFT JOIN grades g ON g.id = e.grade_id
        LEFT JOIN unites u ON u.id = e.unite_id
        WHERE e.id = ?
      `, [req.user.effectif_id])
      if (eff) {
        expNom = `${eff.prenom} ${eff.nom}`
        expGrade = eff.grade_nom
        expUnite = eff.unite_code
        expId = req.user.effectif_id
      }
    }

    const [result] = await pool.execute(`
      INSERT INTO telegrammes (numero, expediteur_id, expediteur_nom, expediteur_grade, expediteur_unite,
        destinataire_id, destinataire_nom, destinataire_unite, objet, contenu, priorite, prive, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      numero, expId, expNom, expGrade, expUnite,
      destinataire_id || null, destinataire_nom || 'Inconnu', destinataire_unite || null,
      objet, contenu, priorite || 'Normal', req.body.prive ? 1 : 0, req.user.id
    ])

    // Discord notification
    const { notifyTelegramme } = require('../utils/discordNotify')
    notifyTelegramme({ numero, expediteur_nom: expNom, destinataire_nom, objet, priorite: priorite || 'Normal', prive: req.body.prive }).catch(() => {})

    res.json({ success: true, data: { id: result.insertId, numero } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/telegrammes/:id/archiver
router.put('/:id/archiver', auth, async (req, res) => {
  try {
    await pool.execute('UPDATE telegrammes SET statut = "Archivé" WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/telegrammes/next-number (for preview)
router.get('/next-number', auth, async (req, res) => {
  try {
    const numero = await nextNumero()
    res.json({ success: true, numero })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/telegrammes/:id (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: 'Admin requis' })
    await pool.execute('DELETE FROM telegrammes WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: err.message }) }
})

module.exports = router
