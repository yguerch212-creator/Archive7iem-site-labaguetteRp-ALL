import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import './medical.css'

const APTITUDES = ['Apte', 'Inapte temporaire', 'Inapte definitif', 'Apte avec reserves']
const APTITUDE_ICONS = { 'Apte': '🟢', 'Inapte temporaire': '🟡', 'Inapte definitif': '🔴', 'Apte avec reserves': '🟠' }

export default function VisitesMedicales() {
  const { user } = useAuth()
  const [visites, setVisites] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [effectifs, setEffectifs] = useState([])
  const [message, setMessage] = useState(null)
  const [filterAptitude, setFilterAptitude] = useState('')
  const [form, setForm] = useState({
    effectif_id: '', date_visite: new Date().toISOString().slice(0, 10),
    medecin: '', diagnostic: '', aptitude: 'Apte', restrictions: '', notes_confidentielles: ''
  })

  const canCreate = user?.isAdmin || user?.isRecenseur || user?.unite_code === '916S'

  useEffect(() => {
    load()
    api.get('/effectifs/all').then(r => setEffectifs(r.data.data)).catch(() => {})
  }, [])

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
      setForm({ effectif_id: '', date_visite: new Date().toISOString().slice(0, 10), medecin: '', diagnostic: '', aptitude: 'Apte', restrictions: '', notes_confidentielles: '' })
      setMessage({ type: 'success', text: 'Visite médicale enregistrée' })
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const filtered = filterAptitude ? visites.filter(v => v.aptitude === filterAptitude) : visites

  // Group by effectif for quick overview
  const latestByEffectif = {}
  visites.forEach(v => {
    if (!latestByEffectif[v.effectif_id] || v.date_visite > latestByEffectif[v.effectif_id].date_visite) {
      latestByEffectif[v.effectif_id] = v
    }
  })
  const inaptes = Object.values(latestByEffectif).filter(v => v.aptitude !== 'Apte')

  return (
    <div className="medical-page">
      <div className="medical-header">
        <h1>🏥 Visites Médicales</h1>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Annuler' : '+ Nouvelle visite'}
          </button>
        )}
      </div>

      {/* Quick stats */}
      <div className="medical-stats">
        <div className="stat-card">
          <div className="stat-value">{visites.length}</div>
          <div className="stat-label">Visites totales</div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-value">{Object.values(latestByEffectif).filter(v => v.aptitude === 'Apte').length}</div>
          <div className="stat-label">Aptes</div>
        </div>
        <div className="stat-card stat-orange">
          <div className="stat-value">{inaptes.length}</div>
          <div className="stat-label">Non aptes</div>
        </div>
      </div>

      {/* Inaptes alert */}
      {inaptes.length > 0 && (
        <div className="medical-alert">
          <strong>⚠️ Effectifs non aptes :</strong>
          {inaptes.map(v => (
            <span key={v.effectif_id} className="inapte-badge">
              {APTITUDE_ICONS[v.aptitude]} {v.effectif_prenom} {v.effectif_nom} — {v.aptitude}
            </span>
          ))}
        </div>
      )}

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="alert-close">✕</button>
        </div>
      )}

      {showForm && (
        <div className="card medical-form">
          <h3>Nouvelle visite médicale</h3>
          <form onSubmit={submit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Effectif *</label>
                <select className="form-input" value={form.effectif_id} onChange={e => setForm(p => ({...p, effectif_id: e.target.value}))} required>
                  <option value="">— Sélectionner —</option>
                  {effectifs.map(e => (
                    <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date visite *</label>
                <input type="date" className="form-input" value={form.date_visite} onChange={e => setForm(p => ({...p, date_visite: e.target.value}))} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Médecin</label>
                <input type="text" className="form-input" value={form.medecin} onChange={e => setForm(p => ({...p, medecin: e.target.value}))} placeholder="Nom du médecin RP" />
              </div>
              <div className="form-group">
                <label className="form-label">Aptitude</label>
                <select className="form-input" value={form.aptitude} onChange={e => setForm(p => ({...p, aptitude: e.target.value}))}>
                  {APTITUDES.map(a => <option key={a} value={a}>{APTITUDE_ICONS[a]} {a}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Diagnostic</label>
              <textarea className="form-input form-textarea" value={form.diagnostic} onChange={e => setForm(p => ({...p, diagnostic: e.target.value}))} rows={3} placeholder="Diagnostic médical..." />
            </div>
            <div className="form-group">
              <label className="form-label">Restrictions</label>
              <input type="text" className="form-input" value={form.restrictions} onChange={e => setForm(p => ({...p, restrictions: e.target.value}))} placeholder="Ex: Interdit de port d'arme lourde, repos 2 semaines..." />
            </div>
            <div className="form-group">
              <label className="form-label">Notes confidentielles</label>
              <textarea className="form-input form-textarea" value={form.notes_confidentielles} onChange={e => setForm(p => ({...p, notes_confidentielles: e.target.value}))} rows={2} placeholder="Visible uniquement par le personnel médical..." />
            </div>
            <button type="submit" className="btn btn-primary">🏥 Enregistrer la visite</button>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="medical-filters">
        <select value={filterAptitude} onChange={e => setFilterAptitude(e.target.value)}>
          <option value="">Toutes les aptitudes</option>
          {APTITUDES.map(a => <option key={a} value={a}>{APTITUDE_ICONS[a]} {a}</option>)}
        </select>
      </div>

      {/* Visites list */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '2rem' }}>📋</p>
          <p>Aucune visite médicale enregistrée</p>
        </div>
      ) : (
        <div className="visites-list">
          {filtered.map(v => (
            <div key={v.id} className="card visite-card">
              <div className="visite-header">
                <div>
                  <span className="visite-name">{v.effectif_grade ? `${v.effectif_grade} ` : ''}{v.effectif_prenom} {v.effectif_nom}</span>
                  <span className="visite-unite">{v.effectif_unite_code}</span>
                </div>
                <span className={`aptitude-badge aptitude-${v.aptitude.replace(/\s/g, '-').toLowerCase()}`}>
                  {APTITUDE_ICONS[v.aptitude]} {v.aptitude}
                </span>
              </div>
              <div className="visite-meta">
                <span>📅 {v.date_visite}</span>
                {v.medecin && <span>👨‍⚕️ Dr. {v.medecin}</span>}
                <span>📝 Par {v.created_by_nom}</span>
              </div>
              {v.diagnostic && <div className="visite-diagnostic">{v.diagnostic}</div>}
              {v.restrictions && <div className="visite-restrictions">⚠️ Restrictions : {v.restrictions}</div>}
              {v.notes_confidentielles && (user?.isAdmin || user?.isRecenseur || user?.unite_code === '916S') && (
                <div className="visite-confidentiel">🔒 {v.notes_confidentielles}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
