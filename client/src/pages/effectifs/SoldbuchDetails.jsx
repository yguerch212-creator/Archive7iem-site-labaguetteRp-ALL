import React, { useState } from 'react'
import apiClient from '../../api/client'

const FIELDS = [
  { key: 'date_naissance', label: 'Date de naissance', placeholder: 'Ex: 15. März 1920' },
  { key: 'lieu_naissance', label: 'Lieu de naissance', placeholder: 'Ex: München, Bayern' },
  { key: 'religion', label: 'Religion', placeholder: 'Ex: Katholisch, Evangelisch, ...' },
  { key: 'beruf', label: 'Profession civile', placeholder: 'Ex: Bäcker, Mechaniker, Student...' },
  { key: 'gestalt', label: 'Corpulence', placeholder: 'Ex: schlank, mittel, kräftig' },
  { key: 'gesicht', label: 'Visage', placeholder: 'Ex: oval, rund, länglich' },
  { key: 'haar', label: 'Cheveux', placeholder: 'Ex: blond, braun, schwarz' },
  { key: 'bart', label: 'Barbe', placeholder: 'Ex: rasiert, Schnurrbart, ...' },
  { key: 'augen', label: 'Yeux', placeholder: 'Ex: blau, grün, braun' },
  { key: 'besondere_kennzeichen', label: 'Signes particuliers', placeholder: 'Ex: Brillenträger, Narbe am Kinn, ...' },
  { key: 'schuhzeuglaenge', label: 'Pointure', placeholder: 'Ex: 42' },
  { key: 'blutgruppe', label: 'Groupe sanguin', placeholder: 'Ex: A, B, AB, O' },
  { key: 'gasmaskengroesse', label: 'Taille masque à gaz', placeholder: 'Ex: 2' },
  { key: 'wehrnummer', label: 'Numéro de service', placeholder: 'Ex: Wien W/18/23/41' },
]

export default function SoldbuchDetails({ effectifId, effectif, onSaved, onClose }) {
  const [editing, setEditing] = useState(null) // key being edited
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const startEdit = (key) => {
    setEditing(key)
    setValue(effectif?.[key] || '')
    setMsg(null)
  }

  const genWehrnummer = () => {
    const code = effectif?.unite_code || '000'
    const rang = String(effectif?.grade_rang || 0).padStart(2, '0')
    const id = String(effectifId).padStart(3, '0')
    const yr = new Date().getFullYear().toString().slice(-2)
    setValue(`${code}/${rang}/${id}/${yr}`)
  }

  const handleSave = async (key) => {
    setSaving(true)
    setMsg(null)
    try {
      const payload = {}
      // Send all current values + the one being edited
      FIELDS.forEach(({ key: k }) => {
        payload[k] = k === key ? (value || null) : (effectif?.[k] || null)
      })
      const res = await apiClient.put(`/soldbuch/${effectifId}/details`, payload)
      setMsg({
        type: 'success',
        text: res.data.pending
          ? '✅ Modification soumise pour validation.'
          : '✅ Enregistré.'
      })
      // Update local effectif data
      if (effectif) effectif[key] = value || null
      setEditing(null)
      setTimeout(() => { if (onSaved) onSaved() }, 1200)
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="paper-card" style={{ marginTop: 'var(--space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>📝 Détailler mon Soldbuch</h3>
        <button className="btn btn-secondary btn-small" onClick={onClose}>✕ Fermer</button>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
        Cliquez sur un champ pour le modifier. Chaque modification est sauvegardée individuellement.
      </p>

      {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: 'var(--space-md)' }}>{msg.text}</div>}

      <table className="table" style={{ fontSize: '0.85rem' }}>
        <thead>
          <tr><th style={{ width: '30%' }}>Champ</th><th>Valeur</th><th style={{ width: 80 }}></th></tr>
        </thead>
        <tbody>
          {FIELDS.map(({ key, label, placeholder }) => (
            <tr key={key}>
              <td style={{ fontWeight: 600 }}>{label}</td>
              <td>
                {editing === key ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {key === 'besondere_kennzeichen' ? (
                      <textarea className="form-textarea" value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} rows={2} style={{ flex: 1 }} />
                    ) : (
                      <input className="form-input" value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} style={{ flex: 1 }} autoFocus />
                    )}
                    {key === 'wehrnummer' && (
                      <button type="button" className="btn btn-secondary btn-small" onClick={genWehrnummer} title="Générer automatiquement">🎲</button>
                    )}
                  </div>
                ) : (
                  <span style={{ color: effectif?.[key] ? 'inherit' : 'var(--text-muted)', fontStyle: effectif?.[key] ? 'normal' : 'italic' }}>
                    {effectif?.[key] || '— non renseigné —'}
                  </span>
                )}
              </td>
              <td style={{ textAlign: 'center' }}>
                {editing === key ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-primary btn-small" onClick={() => handleSave(key)} disabled={saving}>
                      {saving ? '⏳' : '✅'}
                    </button>
                    <button className="btn btn-secondary btn-small" onClick={() => setEditing(null)}>✕</button>
                  </div>
                ) : (
                  <button className="btn btn-secondary btn-small" onClick={() => startEdit(key)}>✏️</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
