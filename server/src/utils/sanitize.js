/**
 * Sanitize user input for use in SQL LIKE patterns.
 * Escapes %, _ and \ characters to prevent wildcard injection.
 */
function escapeLike(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

module.exports = { escapeLike }
