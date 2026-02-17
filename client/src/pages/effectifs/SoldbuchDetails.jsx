import React, { useState } from 'react'
import apiClient from '../../api/client'

/* =============================================
   SoldbuchDetails — Self-service detail form
   Soldier fills their own personal description
   ============================================= */

const FIELDS = [
  { key: 'religion', label: 'Religion', placeholder: 'Ex: Catholique, Protestant, ...' },
  { key: 'beruf', label: 'Profession civile', placeholder: 'Ex: Buchhaendler, Bauer, ...' },
  { key: 'gestalt', label: 'Corpulence', placeholder: 'Ex: schlank, mittel, kraeftig' },
  { key: 'gesicht', label: 'Visage', placeholder: 'Ex: oval, rund, laenglich' },
  { key: 'haar', label: 'Cheveux', placeholder: 'Ex: blond, braun, schwarz' },
  { key: 'bart', label: 'Barbe', placeholder: 'Ex: rasiert, Schnurrbart, ...' },
  { key: 'augen', label: 'Yeux', placeholder: 'Ex: blau, gruen, braun' },
  { key: 'besondere_kennzeichen', label: 'Signes particuliers', placeholder: 'Ex: Brillentraeger, Narbe am Kinn, ...' },
  { key: 'schuhzeuglaenge', label: 'Pointure', placeholder: 'Ex: 42' },
  { key: 'blutgruppe', label: 'Groupe sanguin', placeholder: 'Ex: A, B, AB, O' },
  { key: 'gasmaskengroesse', label: 'Taille masque a gaz', placeholder: 'Ex: 2' },
  { key: 'wehrnummer', label: 'Numero de service', placeholder: 'Ex: Wien W/18/23/41' },
]

export default function SoldbuchDetails({ effectifId, effectif, onSaved, onClose }) {
  const [form, setForm] = useState(() => {
    const f = {}
    FIELDS.forEach(({ key }) => f[key] = effectif?.[key] || '')
    return f
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const genWehrnummer = () => {
    const code = effectif?.unite_code || '000'
    const rang = String(effectif?.grade_rang || 0).padStart(2, '0')
    const id = String(effectifId).padStart(3, '0')
    const yr = new Date().getFullYear().toString().slice(-2)
    set('wehrnummer', `${code}/${rang}/${id}/${yr}`)
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const res = await apiClient.put(`/soldbuch/${effectifId}/details`, form)
      const data = res.data
      setMsg({
        type: 'success',
        text: data.pending
          ? '✅ Details soumis ! Un officier doit valider les modifications.'
          : '✅ Details enregistres.'
      })
      setTimeout(() => {
        if (onSaved) onSaved()
      }, 1500)
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="paper-card" style={{ marginTop: 'var(--space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>📝 Detailler mon Soldbuch</h3>
        <button className="btn btn-secondary btn-small" onClick={onClose}>✕ Fermer</button>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
        Remplissez les informations personnelles de votre Soldbuch. Ces donnees seront soumises pour validation.
      </p>

      {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: 'var(--space-md)' }}>{msg.text}</div>}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2" style={{ gap: 'var(--space-sm)' }}>
          {FIELDS.map(({ key, label, placeholder }) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}</label>
              {key === 'besondere_kennzeichen' ? (
                <textarea
                  className="form-textarea"
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                  rows={2}
                />
              ) : key === 'wehrnummer' ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    className="form-input"
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={placeholder}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-secondary btn-small" onClick={genWehrnummer} title="Générer automatiquement">🎲 Auto</button>
                </div>
              ) : (
                <input
                  className="form-input"
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                />
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? '⏳ Enregistrement...' : '📨 Soumettre les details'}
          </button>
        </div>
      </form>
    </div>
  )
}
