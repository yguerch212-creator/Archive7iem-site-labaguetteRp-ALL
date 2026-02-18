import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'

const GRAVITES = [
  { value: 'legere', label: '🟢 Légère', color: '#27ae60' },
  { value: 'moyenne', label: '🟡 Moyenne', color: '#f39c12' },
  { value: 'grave', label: '🟠 Grave', color: '#e67e22' },
  { value: 'critique', label: '🔴 Critique', color: '#e74c3c' },
]

export default function Blessures() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ effectif_id: '', effectif_nom: '', effectif_nom_libre: '', date_blessure: '', type_blessure: '', localisation: '', circonstances: '', gravite: 'legere', sequelles: '', medecin_nom: user?.username || '', notes: '' })

  const canCreate = user?.isAdmin || user?.isRecenseur || user?.unite_code === '916S'

  useEffect(() => { load() }, [])

  const load = async () => {
    try { const res = await api.get('/medical-soldbuch/blessures'); setItems(res.data.data || []) } catch {}
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/medical-soldbuch/blessures', form)
      setShowForm(false)
      setForm({ effectif_id: '', effectif_nom: '', date_blessure: '', type_blessure: '', localisation: '', circonstances: '', gravite: 'legere', sequelles: '', medecin_nom: '', notes: '' })
      setMessage({ type: 'success', text: 'Blessure enregistrée ✓' })
      setTimeout(() => setMessage(null), 3000)
      load()
    } catch (err) { setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' }) }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ?')) return
    try { await api.delete(`/medical-soldbuch/blessures/${id}`); load() } catch { alert('Erreur') }
  }

  const fmt = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d } }
  const gravLabel = (g) => GRAVITES.find(x => x.value === g)?.label || g

  const filtered = items.filter(i => {
    if (!search) return true
    const s = search.toLowerCase()
    return (i.effectif_nom || '').toLowerCase().includes(s) || (i.type_blessure || '').toLowerCase().includes(s) || (i.localisation || '').toLowerCase().includes(s)
  })

  return (
    <div className="container">
      <BackButton label="← Service médical" to="/medical" />
      <h1 style={{ textAlign: 'center', margin: 'var(--space-lg) 0' }}>🩹 Blessures</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)', fontSize: '0.85rem' }}>
        Verwundungen — Registre des blessures de guerre et accidents
      </p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 8 }}>
        <input type="text" className="form-input" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        {canCreate && <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>{showForm ? '✕ Annuler' : '+ Nouvelle blessure'}</button>}
      </div>

      {showForm && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>Enregistrer une blessure</h3>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Effectif *</label>
              <EffectifAutocomplete value={form.effectif_nom} onChange={(text, eff) => setForm(p => ({ ...p, effectif_nom: text, effectif_id: eff?.id || '', effectif_nom_libre: eff ? '' : text }))} onSelect={eff => setForm(p => ({ ...p, effectif_id: eff.id, effectif_nom: `${eff.prenom} ${eff.nom}`, effectif_nom_libre: '' }))} placeholder="Rechercher ou taper un nom..." />
              {!form.effectif_id && form.effectif_nom && <p style={{ fontSize: '0.75rem', color: 'var(--warning)', margin: '4px 0 0' }}>⚠️ Effectif non trouvé — sera lié automatiquement quand il sera créé</p>}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Date *</label><input type="date" className="form-input" value={form.date_blessure} onChange={e => setForm(p => ({ ...p, date_blessure: e.target.value }))} required /></div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Gravité *</label>
                <select className="form-input" value={form.gravite} onChange={e => setForm(p => ({ ...p, gravite: e.target.value }))}>
                  {GRAVITES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Type de blessure *</label><input type="text" className="form-input" value={form.type_blessure} onChange={e => setForm(p => ({ ...p, type_blessure: e.target.value }))} required placeholder="Balle, éclat d'obus, brûlure..." /></div>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Localisation *</label><input type="text" className="form-input" value={form.localisation} onChange={e => setForm(p => ({ ...p, localisation: e.target.value }))} required placeholder="Bras droit, thorax, jambe gauche..." /></div>
            </div>
            <div className="form-group"><label className="form-label">Circonstances</label><textarea className="form-input" rows={2} value={form.circonstances} onChange={e => setForm(p => ({ ...p, circonstances: e.target.value }))} placeholder="Combat à Carentan, entraînement au tir..." /></div>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Séquelles</label><input type="text" className="form-input" value={form.sequelles} onChange={e => setForm(p => ({ ...p, sequelles: e.target.value }))} placeholder="Aucune, mobilité réduite..." /></div>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Médecin</label><input type="text" className="form-input" value={form.medecin_nom} readOnly style={{ opacity: 0.7 }} /></div>
            </div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <button type="submit" className="btn btn-primary">✓ Enregistrer</button>
          </form>
        </div>
      )}

      <div className="paper-card">
        <table className="table">
          <thead><tr><th>Effectif</th><th>Date</th><th>Type</th><th>Localisation</th><th>Gravité</th><th>Médecin</th>{canCreate && <th></th>}</tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune blessure enregistrée</td></tr> :
              filtered.map(b => (
                <tr key={b.id}>
                  <td>{b.effectif_nom}</td>
                  <td>{fmt(b.date_blessure)}</td>
                  <td>{b.type_blessure}</td>
                  <td>{b.localisation}</td>
                  <td>{gravLabel(b.gravite)}</td>
                  <td>{b.medecin_nom || '—'}</td>
                  {canCreate && <td><button onClick={() => remove(b.id)} className="btn btn-sm btn-secondary" style={{ color: 'var(--danger)' }}>🗑️</button></td>}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
