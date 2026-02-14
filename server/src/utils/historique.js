const { pool } = require('../config/db')

/**
 * Log an event in effectif_historique
 * @param {number} effectifId
 * @param {string} type - 'creation'|'grade'|'decoration'|'reserve'|'reintegration'|'interdit'|'medical'|'rapport'|'affaire'|'pds'|'modification'
 * @param {string} description
 * @param {object} meta - optional JSON metadata
 */
async function logHistorique(effectifId, type, description, meta = null) {
  try {
    await pool.execute(
      'INSERT INTO effectif_historique (effectif_id, type, description, meta) VALUES (?,?,?,?)',
      [effectifId, type, description, meta ? JSON.stringify(meta) : null]
    )
  } catch (err) {
    console.error('historique log error:', err.message)
  }
}

module.exports = { logHistorique }
