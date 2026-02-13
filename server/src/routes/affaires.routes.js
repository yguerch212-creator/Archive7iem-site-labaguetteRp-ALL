const router = require('express').Router()
const { query, queryOne } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')

function canWrite(req) {
  return req.user.isAdmin || req.user.isOfficier || req.user.isFeldgendarmerie
}

async function nextNumero() {
  const year = new Date().getFullYear()
  const row = await queryOne("SELECT numero FROM affaires WHERE numero LIKE ? ORDER BY id DESC LIMIT 1", [`AFF-${year}-%`])
  let seq = 1
  if (row) seq = parseInt(row.numero.split('-')[2]) + 1
  return `AFF-${year}-${String(seq).padStart(3, '0')}`
}

// ==================== AFFAIRES ====================

// GET /api/affaires — list all
router.get('/', optionalAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT a.*,
        u.username AS created_by_username,
        (SELECT COUNT(*) FROM affaires_personnes WHERE affaire_id = a.id) AS nb_personnes,
        (SELECT COUNT(*) FROM affaires_pieces WHERE affaire_id = a.id) AS nb_pieces,
        (SELECT GROUP_CONCAT(DISTINCT COALESCE(CONCAT(e.prenom,' ',e.nom), ap.nom_libre) SEPARATOR ', ')
         FROM affaires_personnes ap LEFT JOIN effectifs e ON ap.effectif_id = e.id
         WHERE ap.affaire_id = a.id AND ap.role = 'Accuse') AS accuses
      FROM affaires a
      LEFT JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
    `)
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }) }
})

// GET /api/affaires/:id — full detail
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const affaire = await queryOne(`
      SELECT a.*, u.username AS created_by_username
      FROM affaires a LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = ?
    `, [req.params.id])
    if (!affaire) return res.status(404).json({ error: 'Affaire introuvable' })

    const personnes = await query(`
      SELECT ap.*, e.nom AS effectif_nom, e.prenom AS effectif_prenom,
        g.nom_complet AS grade_nom, un.code AS unite_code
      FROM affaires_personnes ap
      LEFT JOIN effectifs e ON ap.effectif_id = e.id
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites un ON un.id = e.unite_id
      WHERE ap.affaire_id = ?
      ORDER BY FIELD(ap.role, 'Accuse','Victime','Temoin','Enqueteur','Juge','Defenseur')
    `, [req.params.id])

    const pieces = await query(`
      SELECT p.*, i.nom AS infraction_nom, i.groupe AS infraction_groupe,
        (SELECT COUNT(*) FROM affaires_signatures WHERE piece_id = p.id) AS nb_signatures,
        (SELECT COUNT(*) FROM affaires_signatures WHERE piece_id = p.id AND signe = 1) AS nb_signees
      FROM affaires_pieces p
      LEFT JOIN infractions i ON p.infraction_id = i.id
      WHERE p.affaire_id = ?
      ORDER BY p.created_at
    `, [req.params.id])

    res.json({ ...affaire, personnes, pieces })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }) }
})

// POST /api/affaires — create
router.post('/', auth, async (req, res) => {
  if (!canWrite(req)) return res.status(403).json({ error: 'Non autorisé' })
  const { titre, type, gravite, resume, date_ouverture_rp, date_ouverture_irl, lieu } = req.body
  if (!titre) return res.status(400).json({ error: 'Titre requis' })
  try {
    const numero = await nextNumero()
    const result = await query(
      `INSERT INTO affaires (numero, titre, type, gravite, resume, date_ouverture_rp, date_ouverture_irl, lieu, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [numero, titre, type || 'Enquete', gravite || 1, resume || null,
       date_ouverture_rp || null, date_ouverture_irl || null, lieu || null, req.user.id]
    )
    res.status(201).json({ id: result.insertId, numero })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }) }
})

// PUT /api/affaires/:id — update
router.put('/:id', auth, async (req, res) => {
  if (!canWrite(req)) return res.status(403).json({ error: 'Non autorisé' })
  const { titre, type, statut, gravite, resume, verdict, sanction_prononcee, notes_internes,
          date_cloture_rp, date_cloture_irl, lieu } = req.body
  try {
    await query(`UPDATE affaires SET titre=?, type=?, statut=?, gravite=?, resume=?, verdict=?,
      sanction_prononcee=?, notes_internes=?, date_cloture_rp=?, date_cloture_irl=?, lieu=? WHERE id=?`,
      [titre, type, statut, gravite, resume, verdict || null, sanction_prononcee || null,
       notes_internes || null, date_cloture_rp || null, date_cloture_irl || null, lieu || null, req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }) }
})

// DELETE /api/affaires/:id — admin only
router.delete('/:id', auth, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin requis' })
  try {
    await query('DELETE FROM affaires WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }) }
})

// ==================== PERSONNES ====================

// POST /api/affaires/:id/personnes
router.post('/:id/personnes', auth, async (req, res) => {
  if (!canWrite(req)) return res.status(403).json({ error: 'Non autorisé' })
  const { effectif_id, nom_libre, role, notes } = req.body
  try {
    const result = await query(
      'INSERT INTO affaires_personnes (affaire_id, effectif_id, nom_libre, role, notes) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, effectif_id || null, nom_libre || null, role, notes || null]
    )
    res.status(201).json({ id: result.insertId })
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }) }
})

// DELETE /api/affaires/personnes/:pid
router.delete('/personnes/:pid', auth, async (req, res) => {
  if (!canWrite(req)) return res.status(403).json({ error: 'Non autorisé' })
  try {
    await query('DELETE FROM affaires_personnes WHERE id = ?', [req.params.pid])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }) }
})

// ==================== PIECES ====================

// POST /api/affaires/:id/pieces
router.post('/:id/pieces', auth, async (req, res) => {
  if (!canWrite(req)) return res.status(403).json({ error: 'Non autorisé' })
  const { type, titre, contenu, date_rp, date_irl, redige_par, redige_par_nom,
          infraction_id, infraction_custom, confidentiel } = req.body
  if (!titre || !type) return res.status(400).json({ error: 'Titre et type requis' })
  try {
    const result = await query(
      `INSERT INTO affaires_pieces (affaire_id, type, titre, contenu, date_rp, date_irl,
        redige_par, redige_par_nom, infraction_id, infraction_custom, confidentiel, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, type, titre, contenu || null, date_rp || null, date_irl || null,
       redige_par || null, redige_par_nom || null, infraction_id || null,
       infraction_custom || null, confidentiel ? 1 : 0, req.user.id]
    )
    res.status(201).json({ id: result.insertId })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }) }
})

// GET /api/affaires/pieces/:pid — single piece with signatures
router.get('/pieces/:pid', auth, async (req, res) => {
  try {
    const piece = await queryOne(`
      SELECT p.*, i.nom AS infraction_nom, i.description AS infraction_desc, i.groupe AS infraction_groupe
      FROM affaires_pieces p
      LEFT JOIN infractions i ON p.infraction_id = i.id
      WHERE p.id = ?
    `, [req.params.pid])
    if (!piece) return res.status(404).json({ error: 'Pièce introuvable' })

    const signatures = await query(`
      SELECT s.*, e.nom AS effectif_nom, e.prenom AS effectif_prenom
      FROM affaires_signatures s
      LEFT JOIN effectifs e ON s.effectif_id = e.id
      WHERE s.piece_id = ?
    `, [req.params.pid])

    res.json({ ...piece, signatures })
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }) }
})

// PUT /api/affaires/pieces/:pid
router.put('/pieces/:pid', auth, async (req, res) => {
  if (!canWrite(req)) return res.status(403).json({ error: 'Non autorisé' })
  const { titre, contenu, type, confidentiel } = req.body
  try {
    await query('UPDATE affaires_pieces SET titre=?, contenu=?, type=?, confidentiel=? WHERE id=?',
      [titre, contenu, type, confidentiel ? 1 : 0, req.params.pid])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }) }
})

// DELETE /api/affaires/pieces/:pid
router.delete('/pieces/:pid', auth, async (req, res) => {
  if (!canWrite(req)) return res.status(403).json({ error: 'Non autorisé' })
  try {
    await query('DELETE FROM affaires_pieces WHERE id = ?', [req.params.pid])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }) }
})

// ==================== SIGNATURES ====================

// POST /api/affaires/pieces/:pid/signatures — add signature slot
router.post('/pieces/:pid/signatures', auth, async (req, res) => {
  if (!canWrite(req)) return res.status(403).json({ error: 'Non autorisé' })
  const { effectif_id, nom_signataire, role_signataire } = req.body
  try {
    const result = await query(
      'INSERT INTO affaires_signatures (piece_id, effectif_id, nom_signataire, role_signataire) VALUES (?, ?, ?, ?)',
      [req.params.pid, effectif_id || null, nom_signataire || null, role_signataire || null]
    )
    res.status(201).json({ id: result.insertId })
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }) }
})

// PUT /api/affaires/signatures/:sid/sign — sign (with canvas data)
router.put('/signatures/:sid/sign', auth, async (req, res) => {
  const { signature_data } = req.body
  if (!signature_data) return res.status(400).json({ error: 'Signature requise' })
  try {
    const sig = await queryOne('SELECT * FROM affaires_signatures WHERE id = ?', [req.params.sid])
    if (!sig) return res.status(404).json({ error: 'Signature introuvable' })
    // Only the person themselves or admin can sign
    if (sig.effectif_id && sig.effectif_id !== req.user.effectif_id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Vous ne pouvez signer que pour vous-même' })
    }
    await query('UPDATE affaires_signatures SET signe=1, signature_data=?, date_signature=NOW() WHERE id=?',
      [signature_data, req.params.sid])
    // Save to personal signatures too
    if (req.user.effectif_id) {
      await query(`INSERT INTO signatures_effectifs (effectif_id, signature_data) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE signature_data = VALUES(signature_data)`,
        [req.user.effectif_id, signature_data])
    }
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }) }
})

// GET /api/affaires/my-signature — get my saved signature
router.get('/my-signature', auth, async (req, res) => {
  if (!req.user.effectif_id) return res.json({ data: null })
  try {
    const row = await queryOne('SELECT signature_data FROM signatures_effectifs WHERE effectif_id = ?', [req.user.effectif_id])
    res.json({ data: row?.signature_data || null })
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }) }
})

// POST /api/affaires/signatures/:sid/telegram — send telegram for signature
router.post('/signatures/:sid/telegram', auth, async (req, res) => {
  if (!canWrite(req)) return res.status(403).json({ error: 'Non autorisé' })
  try {
    const sig = await queryOne(`
      SELECT s.*, e.id AS eff_id, e.nom AS eff_nom, e.prenom AS eff_prenom,
        p.titre AS piece_titre, a.numero AS affaire_numero, a.titre AS affaire_titre
      FROM affaires_signatures s
      LEFT JOIN effectifs e ON s.effectif_id = e.id
      LEFT JOIN affaires_pieces p ON s.piece_id = p.id
      LEFT JOIN affaires a ON p.affaire_id = a.id
      WHERE s.id = ?
    `, [req.params.sid])
    if (!sig) return res.status(404).json({ error: 'Signature introuvable' })
    // Anti-spam: check if already sent
    if (sig.telegramme_envoye) {
      return res.status(400).json({ error: 'Télégramme déjà envoyé pour cette signature' })
    }
    if (!sig.eff_id) return res.status(400).json({ error: 'Pas d\'effectif lié' })

    // Find the user account for this effectif
    const userRow = await queryOne('SELECT id FROM users WHERE effectif_id = ?', [sig.eff_id])
    if (!userRow) return res.status(400).json({ error: 'Effectif sans compte utilisateur' })

    // Create telegram
    const year = new Date().getFullYear()
    const lastTel = await queryOne("SELECT numero FROM telegrammes WHERE numero LIKE ? ORDER BY id DESC LIMIT 1", [`TEL-${year}-%`])
    let telSeq = 1
    if (lastTel) telSeq = parseInt(lastTel.numero.split('-')[2]) + 1
    const telNumero = `TEL-${year}-${String(telSeq).padStart(3, '0')}`

    const contenu = `DEMANDE DE SIGNATURE\n\nAffaire: ${sig.affaire_numero} — ${sig.affaire_titre}\nDocument: ${sig.piece_titre}\nRôle: ${sig.role_signataire || 'Signataire'}\n\nVeuillez vous rendre sur la page de l'affaire pour apposer votre signature.\n\n/sanctions → Affaire ${sig.affaire_numero}`

    await query(`INSERT INTO telegrammes (numero, expediteur_id, destinataire_id, objet, contenu, priorite)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [telNumero, req.user.effectif_id || null, sig.eff_id,
       `Signature requise — ${sig.piece_titre}`, contenu, 'Urgent'])

    await query('UPDATE affaires_signatures SET telegramme_envoye=1, telegramme_date=NOW() WHERE id=?', [req.params.sid])
    res.json({ success: true, telegramme: telNumero })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }) }
})

// GET /api/affaires/infractions — proxy to sanctions infractions list
router.get('/ref/infractions', auth, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM infractions ORDER BY groupe, nom')
    res.json(rows)
  } catch (err) { res.status(500).json({ error: 'Erreur serveur' }) }
})

module.exports = router
