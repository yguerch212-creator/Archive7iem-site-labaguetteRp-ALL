import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'

const TYPES_VACCIN = ['Typhus', 'Tetanos', 'Cholera', 'Variole', 'Diphterie', 'Paratyphus A+B', 'Autre']

export default function Vaccinations() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)
  const [search, setSearch] = useState('')
  const autoLot = () => `VAC-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000)}`
  const [form, setForm] = useState({ effectif_id: '', effectif_nom: '', effectif_nom_libre: '', type_vaccin: 'Typhus', date_vaccination: '', date_rappel: '', medecin_nom: user?.username || '', lot: autoLot(), notes: '' })

  const canCreate = user?.isAdmin || user?.isRecenseur || user?.unite_code === '916S'

  useEffect(() => { load() }, [])

  const load = async () => {
    try { const res = await api.get('/medical-soldbuch/vaccinations'); setItems(res.data.data || []) } catch {}
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/medical-soldbuch/vaccinations', form)
      setShowForm(false)
      setForm({ effectif_id: '', effectif_nom: '', type_vaccin: 'Typhus', date_vaccination: '', date_rappel: '', medecin_nom: user?.username || '', lot: autoLot(), notes: '' })
      setMessage({ type: 'success', text: 'Vaccination enregistrée ✓' })
      setTimeout(() => setMessage(null), 3000)
      load()
    } catch (err) { setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' }) }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ?')) return
    try { await api.delete(`/medical-soldbuch/vaccinations/${id}`); load() } catch { alert('Erreur') }
  }

  const fmt = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d } }

  const filtered = items.filter(i => {
    if (!search) return true
    const s = search.toLowerCase()
    return (i.effectif_nom || '').toLowerCase().includes(s) || (i.type_vaccin || '').toLowerCase().includes(s)
  })

  return (
    <div className="container">
      <BackButton label="← Service médical" to="/medical" />
      <h1 style={{ textAlign: 'center', margin: 'var(--space-lg) 0' }}>💉 Vaccinations</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)', fontSize: '0.85rem' }}>
        Schutzimpfungen — Registre des vaccinations
      </p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 8 }}>
        <input type="text" className="form-input" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        {canCreate && <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>{showForm ? '✕ Annuler' : '+ Nouvelle vaccination'}</button>}
      </div>

      {showForm && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>Nouvelle vaccination</h3>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Effectif *</label>
              <EffectifAutocomplete value={form.effectif_nom} onChange={(text, eff) => setForm(p => ({ ...p, effectif_nom: text, effectif_id: eff?.id || '', effectif_nom_libre: eff ? '' : text }))} onSelect={eff => setForm(p => ({ ...p, effectif_id: eff.id, effectif_nom: `${eff.prenom} ${eff.nom}`, effectif_nom_libre: '' }))} placeholder="Rechercher ou taper un nom..." />
              {!form.effectif_id && form.effectif_nom && <p style={{ fontSize: '0.75rem', color: 'var(--warning)', margin: '4px 0 0' }}>⚠️ Effectif non trouvé — sera lié automatiquement quand il sera créé</p>}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Type de vaccin *</label>
                <select className="form-input" value={form.type_vaccin} onChange={e => setForm(p => ({ ...p, type_vaccin: e.target.value }))}>
                  {TYPES_VACCIN.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Date *</label><input type="date" className="form-input" value={form.date_vaccination} onChange={e => setForm(p => ({ ...p, date_vaccination: e.target.value }))} required /></div>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Rappel</label><input type="date" className="form-input" value={form.date_rappel} onChange={e => setForm(p => ({ ...p, date_rappel: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Médecin</label><input type="text" className="form-input" value={form.medecin_nom} readOnly style={{ opacity: 0.7 }} /></div>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">N° de lot</label><input type="text" className="form-input" value={form.lot} readOnly style={{ opacity: 0.7 }} /></div>
            </div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <button type="submit" className="btn btn-primary">✓ Enregistrer</button>
          </form>
        </div>
      )}

      <div className="paper-card">
        <table className="table">
          <thead><tr><th>Effectif</th><th>Vaccin</th><th>Date</th><th>Rappel</th><th>Médecin</th><th>Lot</th>{canCreate && <th></th>}</tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune vaccination</td></tr> :
              filtered.map(v => (
                <tr key={v.id}>
                  <td>{v.effectif_nom}</td>
                  <td>{v.type_vaccin}</td>
                  <td>{fmt(v.date_vaccination)}</td>
                  <td>{fmt(v.date_rappel)}</td>
                  <td>{v.medecin_nom || '—'}</td>
                  <td>{v.lot || '—'}</td>
                  {canCreate && <td><button onClick={() => remove(v.id)} className="btn btn-sm btn-secondary" style={{ color: 'var(--danger)' }}>🗑️</button></td>}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
