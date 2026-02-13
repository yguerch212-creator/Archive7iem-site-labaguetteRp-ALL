import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'

const APTITUDES = ['Apte', 'Inapte temporaire', 'Inapte definitif', 'Apte avec reserves']
const APTITUDE_ICONS = { 'Apte': '🟢', 'Inapte temporaire': '🟡', 'Inapte definitif': '🔴', 'Apte avec reserves': '🟠' }

export default function VisitesMedicales() {
  const { user } = useAuth()
  const [visites, setVisites] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)
  const [filterAptitude, setFilterAptitude] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    effectif_id: '', effectif_nom: '', date_visite: new Date().toISOString().slice(0, 10),
    medecin: '', diagnostic: '', aptitude: 'Apte', restrictions: '', notes_confidentielles: ''
  })

  const canCreate = user?.isAdmin || user?.isRecenseur || user?.unite_code === '916S'

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await api.get('/medical')
      setVisites(res.data.data)
    } catch (err) { console.error(err) }
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/medical', form)
      setShowForm(false)
      setForm({ effectif_id: '', effectif_nom: '', date_visite: new Date().toISOString().slice(0, 10), medecin: '', diagnostic: '', aptitude: 'Apte', restrictions: '', notes_confidentielles: '' })
      setMessage({ type: 'success', text: 'Visite médicale enregistrée ✓' })
      setTimeout(() => setMessage(null), 3000)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const fmtDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('fr-FR') : '—'

  const filtered = visites.filter(v => {
    if (filterAptitude && v.aptitude !== filterAptitude) return false
    if (search && !`${v.effectif_prenom} ${v.effectif_nom} ${v.medecin || ''}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton label="← Tableau de bord" />
        {canCreate && (
          <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Annuler' : '+ Nouvelle visite'}
          </button>
        )}
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>🏥 Visites Médicales</h1>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {showForm && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>Nouvelle visite médicale</h3>
          <form onSubmit={submit}>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
                <label className="form-label">Effectif *</label>
                <EffectifAutocomplete
                  value={form.effectif_nom}
                  onChange={(text, eff) => setForm(p => ({...p, effectif_nom: text, effectif_id: eff?.id || ''}))}
                  onSelect={eff => setForm(p => ({...p, effectif_id: eff.id, effectif_nom: `${eff.prenom} ${eff.nom}`}))}
                  placeholder="Rechercher un effectif..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date visite *</label>
                <input type="date" className="form-input" value={form.date_visite} onChange={e => setForm(p => ({...p, date_visite: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Aptitude</label>
                <select className="form-input" value={form.aptitude} onChange={e => setForm(p => ({...p, aptitude: e.target.value}))}>
                  {APTITUDES.map(a => <option key={a} value={a}>{APTITUDE_ICONS[a]} {a}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Médecin</label>
                <input type="text" className="form-input" value={form.medecin} onChange={e => setForm(p => ({...p, medecin: e.target.value}))} placeholder="Nom du médecin RP" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Restrictions</label>
                <input type="text" className="form-input" value={form.restrictions} onChange={e => setForm(p => ({...p, restrictions: e.target.value}))} placeholder="Repos, interdit arme lourde..." />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Diagnostic</label>
              <textarea className="form-input" value={form.diagnostic} onChange={e => setForm(p => ({...p, diagnostic: e.target.value}))} rows={3} placeholder="Diagnostic médical..." style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" className="btn btn-primary">🏥 Enregistrer la visite</button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <input className="form-input" style={{ maxWidth: 250 }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-input" style={{ maxWidth: 200 }} value={filterAptitude} onChange={e => setFilterAptitude(e.target.value)}>
          <option value="">Toutes les aptitudes</option>
          {APTITUDES.map(a => <option key={a} value={a}>{APTITUDE_ICONS[a]} {a}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="paper-card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={th}>Aptitude</th>
              <th style={th}>Effectif</th>
              <th style={th}>Date visite</th>
              <th style={th}>Médecin</th>
              <th style={th}>Diagnostic</th>
              <th style={th}>Restrictions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>Aucune visite médicale</td></tr>
            ) : filtered.map(v => (
              <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)', background: v.aptitude === 'Inapte definitif' ? 'rgba(139,74,71,0.04)' : v.aptitude === 'Inapte temporaire' ? 'rgba(161,124,71,0.04)' : '' }}>
                <td style={td}><span style={{ whiteSpace: 'nowrap' }}>{APTITUDE_ICONS[v.aptitude]} {v.aptitude}</span></td>
                <td style={td}><strong>{v.effectif_grade ? `${v.effectif_grade} ` : ''}{v.effectif_prenom} {v.effectif_nom}</strong><br/><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.effectif_unite_code || ''}</span></td>
                <td style={td}>{fmtDate(v.date_visite)}</td>
                <td style={td}>{v.medecin || '—'}</td>
                <td style={{ ...td, maxWidth: 250 }}>{v.diagnostic || '—'}</td>
                <td style={td}>{v.restrictions || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)', whiteSpace: 'nowrap' }
const td = { padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'top' }
