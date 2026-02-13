// Format date as dd/mm/yyyy (European)
export function formatDate(d) {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date)) return d // return as-is if not parseable
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Format date + time as dd/mm/yyyy HH:mm
export function formatDateTime(d) {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date)) return d
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Format date as dd/mm/yyyy or return raw string if already formatted (e.g. "Mars 1944")
export function formatDateSoft(d) {
  if (!d) return '—'
  // If it looks like ISO or DB date, format it
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return formatDate(d)
  return d // Already human-readable (e.g. RP dates)
}
