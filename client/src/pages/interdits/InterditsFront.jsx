import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'
import './interdits.css'

export default function InterditsFront() {
  const { user } = useAuth()
  const [interdits, setInterdits] = useState([])
  const [showAll, setShowAll] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [effectifs, setEffectifs] = useState([])
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState({ effectif_id: '', effectif_nom: '', motif: '', type: 'Disciplinaire', date_debut: new Date().toISOString().slice(0, 10), date_fin: '', notes: '' })

  const canCreate = user?.isAdmin || user?.isOfficier || user?.unite_code === '254'

  useEffect(() => {
    load()
    api.get('/effectifs/all').then(r => setEffectifs(r.data.data)).catch(() => {})
  }, [showAll])

  const load = async () => {
    try {
      const res = await api.get('/interdits', { params: showAll ? { all: '1' } : {} })
      setInterdits(res.data.data)
    } catch (err) { console.error(err) }
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/interdits', form)
      setShowForm(false)
      setForm({ effectif_id: '', effectif_nom: '', motif: '', type: 'Disciplinaire', date_debut: new Date().toISOString().slice(0, 10), date_fin: '', notes: '' })
      setMessage({ type: 'success', text: 'Interdit de front prononcé' })
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const lever = async (id) => {
    const motif = prompt('Motif de la levée :')
    if (!motif) return
    try {
      await api.put(`/interdits/${id}/lever`, { motif_levee: motif })
      setMessage({ type: 'success', text: 'Interdit levé' })
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const supprimer = async (id) => {
    if (!confirm('Supprimer définitivement cet interdit ?')) return
    try {
      await api.delete(`/interdits/${id}`)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  return (
    <div className="interdits-page">
      <Link to="/dashboard" className="btn-back">← Tableau de bord</Link>
      <div className="interdits-header">
        <h1>🚫 Interdits de Front</h1>
        <div className="interdits-actions">
          <label className="toggle-label">
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
            Voir les levés
          </label>
          {canCreate && (
            <button className="btn btn-danger" onClick={() => setShowForm(!showForm)}>
              {showForm ? '✕ Annuler' : '+ Prononcer un interdit'}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="alert-close">✕</button>
        </div>
      )}

      {showForm && (
        <div className="card interdit-form">
          <h3>Prononcer un interdit de front</h3>
          <form onSubmit={submit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Effectif concerné *</label>
                <EffectifAutocomplete
                  effectifs={effectifs}
                  value={form.effectif_nom}
                  onChange={(text, eff) => setForm(p => ({...p, effectif_nom: text, effectif_id: eff?.id || ''}))}
                  placeholder="Rechercher ou saisir un nom..."
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                  <option value="Disciplinaire">Disciplinaire</option>
                  <option value="Medical">Médical</option>
                  <option value="Administratif">Administratif</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date début *</label>
                <input type="date" className="form-input" value={form.date_debut} onChange={e => setForm(p => ({...p, date_debut: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Date fin (vide = indéterminé)</label>
                <input type="date" className="form-input" value={form.date_fin} onChange={e => setForm(p => ({...p, date_fin: e.target.value}))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Motif *</label>
              <textarea className="form-input form-textarea" value={form.motif} onChange={e => setForm(p => ({...p, motif: e.target.value}))} required rows={3} placeholder="Raison de l'interdit de front..." />
            </div>
            <div className="form-group">
              <label className="form-label">Notes complémentaires</label>
              <textarea className="form-input form-textarea" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} rows={2} placeholder="Optionnel..." />
            </div>
            <button type="submit" className="btn btn-danger">🚫 Prononcer l'interdit</button>
          </form>
        </div>
      )}

      {interdits.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '2rem' }}>✅</p>
          <p>Aucun interdit de front {showAll ? '' : 'actif'}</p>
        </div>
      ) : (
        <div className="interdits-list">
          {interdits.map(i => (
            <div key={i.id} className={`card interdit-card ${i.actif ? 'interdit-actif' : 'interdit-leve'}`}>
              <div className="interdit-badge">
                {i.actif ? '🔴 ACTIF' : '✅ LEVÉ'}
              </div>
              <div className="interdit-header">
                <div>
                  <span className="interdit-name">{i.effectif_grade ? `${i.effectif_grade} ` : ''}{i.effectif_prenom} {i.effectif_nom}</span>
                  <span className="interdit-unite">{i.effectif_unite_code}</span>
                </div>
                <span className={`interdit-type type-${i.type.toLowerCase()}`}>{i.type}</span>
              </div>
              <div className="interdit-motif">{i.motif}</div>
              <div className="interdit-meta">
                <span>📅 Du {i.date_debut}{i.date_fin ? ` au ${i.date_fin}` : ' — indéterminé'}</span>
                <span>👤 Ordonné par {i.ordonne_par_nom}</span>
                {!i.actif && i.leve_par_nom && <span>✅ Levé par {i.leve_par_nom}</span>}
              </div>
              {i.notes && <div className="interdit-notes">{i.notes}</div>}
              {i.actif && canCreate && (
                <div className="interdit-actions">
                  <button className="btn btn-sm btn-success" onClick={() => lever(i.id)}>✅ Lever l'interdit</button>
                  {user?.isAdmin && <button className="btn btn-sm btn-ghost" onClick={() => supprimer(i.id)}>🗑️ Supprimer</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
