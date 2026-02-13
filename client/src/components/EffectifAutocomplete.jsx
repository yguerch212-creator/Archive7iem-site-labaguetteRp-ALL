import { useState, useRef, useEffect } from 'react'
import api from '../api/client'

/**
 * Autocomplete input that searches effectifs by name.
 * Props:
 *  - effectifs: optional array (auto-fetches if not provided)
 *  - value: current text value
 *  - onChange(text, effectif|null): called on text change
 *  - onSelect(effectif): called when an effectif is picked from list
 *  - placeholder
 *  - required
 *  - className
 */
export default function EffectifAutocomplete({ effectifs: externalEffectifs, value, onChange, onSelect, placeholder, required, className = 'form-input' }) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [internalEffectifs, setInternalEffectifs] = useState([])
  const ref = useRef(null)

  // Auto-fetch if no effectifs prop
  useEffect(() => {
    if (!externalEffectifs) {
      api.get('/effectifs/all').then(r => {
        setInternalEffectifs(r.data.data || r.data || [])
      }).catch(() => {})
    }
  }, [externalEffectifs])

  const effectifs = externalEffectifs || internalEffectifs

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
    const display = `${eff.prenom} ${eff.nom}`
    if (onChange) onChange(display, eff)
    if (onSelect) onSelect(eff)
    setOpen(false)
    setHighlighted(-1)
  }

  const handleChange = (e) => {
    if (onChange) onChange(e.target.value, null)
    setOpen(true)
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
        onChange={handleChange}
        onFocus={() => { if (q.length >= 1) setOpen(true) }}
        onKeyDown={handleKey}
        placeholder={placeholder || 'Nom ou saisie libre...'}
        required={required}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="autocomplete-list">
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
