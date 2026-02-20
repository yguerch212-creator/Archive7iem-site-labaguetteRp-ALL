// Format date as dd/mm/yyyy (European)
export function formatDate(d) {
  if (!d) return '—'
  // If already dd/mm/yyyy, return as-is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d
  // If dd/mm/yyyy with other separators, normalize
  const dmy = d.match(/^(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})$/)
  if (dmy) return `${dmy[1]}/${dmy[2]}/${dmy[3]}`
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

// Convert ISO week (2026-W08) to date range "14/02 — 21/02/2026"
export function formatWeek(w) {
  if (!w || !w.includes('-W')) return w
  try {
    const [y, wn] = w.split('-W').map(Number)
    const jan4 = new Date(Date.UTC(y, 0, 4))
    const dow = jan4.getUTCDay() || 7
    const mon = new Date(jan4)
    mon.setUTCDate(jan4.getUTCDate() - dow + 1 + (wn - 1) * 7)
    const fri = new Date(mon); fri.setUTCDate(mon.getUTCDate() + 4)
    const nxt = new Date(fri); nxt.setUTCDate(fri.getUTCDate() + 7)
    const fmt = d => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    return `${fmt(fri)} — ${fmt(nxt)}/${y}`
  } catch { return w }
}

// Format date as dd/mm/yyyy or return raw string if already formatted (e.g. "Mars 1944")
export function formatDateSoft(d) {
  if (!d) return '—'
  // If it looks like ISO or DB date, format it
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return formatDate(d)
  return d // Already human-readable (e.g. RP dates)
}
