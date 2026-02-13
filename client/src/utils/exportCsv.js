/**
 * Export data as CSV file
 * @param {Array<Object>} data - Array of objects
 * @param {Array<{key, label}>} columns - Column definitions
 * @param {string} filename - Output filename (without .csv)
 */
export function exportCsv(data, columns, filename = 'export') {
  if (!data || data.length === 0) return alert('Aucune donnée à exporter')

  const separator = ';' // Excel-friendly for FR locale
  const header = columns.map(c => `"${c.label}"`).join(separator)
  const rows = data.map(row =>
    columns.map(c => {
      let val = typeof c.key === 'function' ? c.key(row) : (row[c.key] ?? '')
      // Escape quotes
      val = String(val).replace(/"/g, '""')
      return `"${val}"`
    }).join(separator)
  )

  const bom = '\uFEFF' // UTF-8 BOM for Excel
  const csv = bom + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
