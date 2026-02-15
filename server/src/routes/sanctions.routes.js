const { logActivity } = require('../utils/logger')
const router = require('express').Router();
const { query, queryOne } = require('../config/db');
const auth = require('../middleware/auth');

function convertDateFR(dateStr) {
  if (!dateStr) return null
  const m = String(dateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return dateStr
}

// Helper: check if user can write sanctions (admin, officier, feldgendarmerie)
function canWrite(req) {
  return req.user.isAdmin || req.user.isOfficier || req.user.isFeldgendarmerie;
}

// Helper: max groupe user can sanction
function maxGroupe(req) {
  if (req.user.isAdmin || req.user.isOfficier) return 5;
  // Feldgendarmerie sous-off = 1-3, homme du rang = 1-2
  // For now treat all feld as sous-off level (1-3) — can refine later
  if (req.user.isFeldgendarmerie) return 3;
  return 0;
}

// Generate next sanction number SAN-YYYY-NNN
async function nextNumero() {
  const year = new Date().getFullYear();
  const rows = await query(
    "SELECT numero FROM sanctions WHERE numero LIKE ? ORDER BY id DESC LIMIT 1",
    [`SAN-${year}-%`]
  );
  let seq = 1;
  if (rows.length) {
    const parts = rows[0].numero.split('-');
    seq = parseInt(parts[2]) + 1;
  }
  return `SAN-${year}-${String(seq).padStart(3, '0')}`;
}

// GET /api/sanctions — list all sanctions
router.get('/', auth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT s.*, 
        e.nom as effectif_nom, e.prenom as effectif_prenom,
        
        i.nom as infraction_nom, i.groupe as infraction_groupe,
        u.username as created_by_username
      FROM sanctions s
      LEFT JOIN effectifs e ON s.effectif_id = e.id
      LEFT JOIN infractions i ON s.infraction_id = i.id
      LEFT JOIN users u ON s.created_by = u.id
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /sanctions error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/sanctions/infractions — list all infractions from code
router.get('/infractions', auth, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM infractions ORDER BY groupe, nom');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/sanctions/effectif/:id — casier of an effectif
router.get('/effectif/:id', auth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT s.*, 
        i.nom as infraction_nom, i.groupe as infraction_groupe,
        u.username as created_by_username
      FROM sanctions s
      LEFT JOIN infractions i ON s.infraction_id = i.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.effectif_id = ?
      ORDER BY s.created_at DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/sanctions/:id — single sanction
router.get('/:id', auth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT s.*, 
        e.nom as effectif_nom, e.prenom as effectif_prenom,
        
        i.nom as infraction_nom, i.description as infraction_description,
        i.groupe as infraction_groupe, i.groupe_recidive,
        u.username as created_by_username
      FROM sanctions s
      LEFT JOIN effectifs e ON s.effectif_id = e.id
      LEFT JOIN infractions i ON s.infraction_id = i.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Sanction introuvable' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/sanctions — create sanction
router.post('/', auth, async (req, res) => {
  if (!canWrite(req)) return res.status(403).json({ error: 'Non autorisé' });
  
  const { effectif_id, infraction_id, infraction_custom, groupe_sanction,
          description, sanction_appliquee, date_rp, date_irl, lieu,
          agent_id, agent_nom, recidive, notes_internes } = req.body;
  
  if (!effectif_id || !groupe_sanction || !description) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  
  const max = maxGroupe(req);
  if (groupe_sanction > max) {
    return res.status(403).json({ error: `Votre accréditation ne permet que les sanctions de groupe 1 à ${max}` });
  }
  
  try {
    const numero = await nextNumero();
    const result = await query(`
      INSERT INTO sanctions (numero, effectif_id, infraction_id, infraction_custom,
        groupe_sanction, description, sanction_appliquee, date_rp, date_irl, lieu,
        agent_id, agent_nom, recidive, notes_internes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [numero, effectif_id, infraction_id || null, infraction_custom || null,
        groupe_sanction, description, sanction_appliquee || null,
        date_rp || null, convertDateFR(date_irl), lieu || null,
        agent_id || null, agent_nom || null, recidive ? 1 : 0,
        notes_internes || null, req.user.id]);
    
    res.status(201).json({ id: result.insertId, numero });
  } catch (err) {
    console.error('POST /sanctions error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/sanctions/:id — update sanction
router.put('/:id', auth, async (req, res) => {
  if (!canWrite(req)) return res.status(403).json({ error: 'Non autorisé' });
  
  const { statut, sanction_appliquee, notes_internes } = req.body;
  
  try {
    await query(`
      UPDATE sanctions SET statut = ?, sanction_appliquee = ?, notes_internes = ?
      WHERE id = ?
    `, [statut, sanction_appliquee, notes_internes, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/sanctions/:id — admin only
router.delete('/:id', auth, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin requis' });
  
  try {
    await query('DELETE FROM sanctions WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
