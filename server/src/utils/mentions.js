const { queryOne, pool } = require('../config/db')

/**
 * Save a mention and try to auto-reconcile with effectifs.
 * @param {string} sourceType - 'rapport', 'interdit', 'medical', etc.
 * @param {number} sourceId - ID of the source record
 * @param {string} champ - field name (e.g. 'recommande_nom', 'mise_en_cause_nom')
 * @param {string} nomSaisi - the typed name
 * @param {number|null} effectifId - if already resolved
 */
async function saveMention(sourceType, sourceId, champ, nomSaisi, effectifId = null) {
  if (!nomSaisi || !nomSaisi.trim()) return null

  let resolvedId = effectifId

  // Try to auto-reconcile if no effectif_id
  if (!resolvedId) {
    const parts = nomSaisi.trim().split(/\s+/)
    if (parts.length >= 2) {
      const match = await queryOne(
        'SELECT id FROM effectifs WHERE (LOWER(prenom) = LOWER(?) AND LOWER(nom) = LOWER(?)) OR (LOWER(prenom) = LOWER(?) AND LOWER(nom) = LOWER(?))',
        [parts[0], parts.slice(1).join(' '), parts.slice(1).join(' '), parts[0]]
      )
      if (match) resolvedId = match.id
    } else {
      // Single name - try nom match
      const match = await queryOne('SELECT id FROM effectifs WHERE LOWER(nom) = LOWER(?)', [parts[0]])
      if (match) resolvedId = match.id
    }
  }

  const [result] = await pool.execute(
    'INSERT INTO mentions (source_type, source_id, champ, nom_saisi, effectif_id, reconciled) VALUES (?, ?, ?, ?, ?, ?)',
    [sourceType, sourceId, champ, nomSaisi.trim(), resolvedId, resolvedId ? 1 : 0]
  )

  return { id: result.insertId, effectif_id: resolvedId, reconciled: !!resolvedId }
}

/**
 * Auto-reconcile all unresolved mentions for a given effectif name.
 * Called when a new effectif is created.
 */
async function reconcileForEffectif(effectifId, nom, prenom) {
  const fullName1 = `${prenom} ${nom}`.toLowerCase()
  const fullName2 = `${nom} ${prenom}`.toLowerCase()
  
  await pool.execute(
    `UPDATE mentions SET effectif_id = ?, reconciled = 1 
     WHERE reconciled = 0 AND (LOWER(nom_saisi) = ? OR LOWER(nom_saisi) = ? OR LOWER(nom_saisi) = ?)`,
    [effectifId, fullName1, fullName2, nom.toLowerCase()]
  )
}

module.exports = { saveMention, reconcileForEffectif }
