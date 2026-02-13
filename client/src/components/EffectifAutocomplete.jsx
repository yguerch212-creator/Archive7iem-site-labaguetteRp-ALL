import { useState, useRef, useEffect } from 'react'

/**
 * Autocomplete input that searches effectifs by name.
 * Props:
 *  - effectifs: array of {id, nom, prenom, grade_nom, unite_code}
 *  - value: current text value
 *  - onChange(text, effectif|null): called on change; effectif is set if picked from list
 *  - placeholder
 *  - required
 *  - className
 */
export default function EffectifAutocomplete({ effectifs = [], value, onChange, placeholder, required, className = 'form-input' }) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const ref = useRef(null)
  const listRef = useRef(null)

  const q = (value || '').toLowerCase().trim()
  const filtered = q.length >= 1
    ? effectifs.filter(e => `${e.prenom} ${e.nom}`.toLowerCase().includes(q) || `${e.nom} ${e.prenom}`.toLowerCase().includes(q)).slice(0, 8)
    : []

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (eff) => {
    onChange(`${eff.prenom} ${eff.nom}`, eff)
    setOpen(false)
    setHighlighted(-1)
  }

  const handleKey = (e) => {
    if (!open || filtered.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter' && highlighted >= 0) { e.preventDefault(); pick(filtered[highlighted]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        className={className}
        value={value}
        onChange={e => { onChange(e.target.value, null); setOpen(true); setHighlighted(-1) }}
        onFocus={() => { if (q.length >= 1) setOpen(true) }}
        onKeyDown={handleKey}
        placeholder={placeholder || 'Nom ou saisie libre...'}
        required={required}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul ref={listRef} className="autocomplete-list">
          {filtered.map((eff, i) => (
            <li
              key={eff.id}
              className={`autocomplete-item ${i === highlighted ? 'autocomplete-active' : ''}`}
              onMouseDown={() => pick(eff)}
              onMouseEnter={() => setHighlighted(i)}
            >
              <span className="autocomplete-name">{eff.prenom} {eff.nom}</span>
              <span className="autocomplete-meta">{eff.grade_nom || ''} — {eff.unite_code || ''}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
