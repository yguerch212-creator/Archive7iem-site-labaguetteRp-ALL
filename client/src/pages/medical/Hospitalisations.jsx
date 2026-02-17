import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'

export default function Hospitalisations() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ effectif_id: '', effectif_nom: '', effectif_nom_libre: '', date_entree: '', date_sortie: '', etablissement: '', motif: '', diagnostic: '', traitement: '', medecin_nom: '', notes: '' })

  const canCreate = user?.isAdmin || user?.isRecenseur || user?.unite_code === '916S'

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await api.get('/medical-soldbuch/hospitalisations')
      setItems(res.data.data || [])
    } catch (err) { console.error(err) }
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/medical-soldbuch/hospitalisations', form)
      setShowForm(false)
      setForm({ effectif_id: '', effectif_nom: '', date_entree: '', date_sortie: '', etablissement: '', motif: '', diagnostic: '', traitement: '', medecin_nom: '', notes: '' })
      setMessage({ type: 'success', text: 'Hospitalisation enregistrée ✓' })
      setTimeout(() => setMessage(null), 3000)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cette hospitalisation ?')) return
    try { await api.delete(`/medical-soldbuch/hospitalisations/${id}`); load() } catch { alert('Erreur') }
  }

  const fmt = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d } }

  const filtered = items.filter(i => {
    if (!search) return true
    const s = search.toLowerCase()
    return (i.effectif_nom || '').toLowerCase().includes(s) || (i.etablissement || '').toLowerCase().includes(s) || (i.motif || '').toLowerCase().includes(s)
  })

  return (
    <div className="container">
      <BackButton label="← Service médical" to="/medical" />
      <h1 style={{ textAlign: 'center', margin: 'var(--space-lg) 0' }}>🏨 Hospitalisations</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)', fontSize: '0.85rem' }}>
        Lazarettbehandlung — Séjours en infirmerie / hôpital de campagne
      </p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 8 }}>
        <input type="text" className="form-input" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        {canCreate && <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>{showForm ? '✕ Annuler' : '+ Nouvelle hospitalisation'}</button>}
      </div>

      {showForm && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>Nouvelle hospitalisation</h3>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Effectif *</label>
              <EffectifAutocomplete value={form.effectif_nom} onChange={(text, eff) => { setForm(p => ({ ...p, effectif_nom: text, effectif_id: eff?.id || '', effectif_nom_libre: eff ? '' : text })) }} onSelect={eff => setForm(p => ({ ...p, effectif_id: eff.id, effectif_nom: `${eff.prenom} ${eff.nom}`, effectif_nom_libre: '' }))} placeholder="Rechercher ou taper un nom..." />
              {!form.effectif_id && form.effectif_nom && <p style={{ fontSize: '0.75rem', color: 'var(--warning)', margin: '4px 0 0' }}>⚠️ Effectif non trouvé — sera lié automatiquement quand il sera créé</p>}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Date d'entrée *</label><input type="date" className="form-input" value={form.date_entree} onChange={e => setForm(p => ({ ...p, date_entree: e.target.value }))} required /></div>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Date de sortie</label><input type="date" className="form-input" value={form.date_sortie} onChange={e => setForm(p => ({ ...p, date_sortie: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Établissement / Lazarett *</label><input type="text" className="form-input" value={form.etablissement} onChange={e => setForm(p => ({ ...p, etablissement: e.target.value }))} required placeholder="Infirmerie du 916., Feldlazarett Nord..." /></div>
            <div className="form-group"><label className="form-label">Motif *</label><input type="text" className="form-input" value={form.motif} onChange={e => setForm(p => ({ ...p, motif: e.target.value }))} required placeholder="Blessure par balle, maladie, accident..." /></div>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Diagnostic</label><input type="text" className="form-input" value={form.diagnostic} onChange={e => setForm(p => ({ ...p, diagnostic: e.target.value }))} placeholder="Fracture tibia gauche..." /></div>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Médecin</label><input type="text" className="form-input" value={form.medecin_nom} onChange={e => setForm(p => ({ ...p, medecin_nom: e.target.value }))} placeholder="Dr. Braun" /></div>
            </div>
            <div className="form-group"><label className="form-label">Traitement</label><textarea className="form-input" rows={2} value={form.traitement} onChange={e => setForm(p => ({ ...p, traitement: e.target.value }))} placeholder="Chirurgie, repos, médicaments..." /></div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <button type="submit" className="btn btn-primary">✓ Enregistrer</button>
          </form>
        </div>
      )}

      <div className="paper-card">
        <table className="table">
          <thead><tr><th>Effectif</th><th>Entrée</th><th>Sortie</th><th>Établissement</th><th>Motif</th><th>Médecin</th>{canCreate && <th></th>}</tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune hospitalisation</td></tr> :
              filtered.map(h => (
                <tr key={h.id}>
                  <td>{h.effectif_nom}</td>
                  <td>{fmt(h.date_entree)}</td>
                  <td>{fmt(h.date_sortie)}</td>
                  <td>{h.etablissement}</td>
                  <td>{h.motif}</td>
                  <td>{h.medecin_nom || '—'}</td>
                  {canCreate && <td><button onClick={() => remove(h.id)} className="btn btn-sm btn-secondary" style={{ color: 'var(--danger)' }}>🗑️</button></td>}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
