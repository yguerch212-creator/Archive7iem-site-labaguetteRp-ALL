import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import './situation-front.css'

export default function SituationFront() {
  const { user } = useAuth()
  const [cartes, setCartes] = useState([])
  const [selected, setSelected] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type_event: 'attaque', resultat: 'win', camp_vainqueur: 'allemand', date_rp: '', note: '' })

  const canReport = user?.isAdmin || user?.isOfficier || user?.isSousOfficier || user?.isEtatMajor
  const canDelete = user?.isAdmin || user?.isOfficier || user?.isEtatMajor

  const load = async () => {
    try {
      const r = await api.get('/front/cartes')
      setCartes(r.data.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const loadEvents = async (carteId) => {
    setSelected(carteId)
    try {
      const r = await api.get(`/front/cartes/${carteId}/events`)
      setEvents(r.data.data)
    } catch { setEvents([]) }
  }

  const submitEvent = async (e) => {
    e.preventDefault()
    if (!selected) return
    try {
      await api.post(`/front/cartes/${selected}/events`, form)
      setShowForm(false)
      setForm({ type_event: 'attaque', resultat: 'win', camp_vainqueur: 'allemand', date_rp: '', note: '' })
      loadEvents(selected)
      load()
    } catch (err) { alert(err.response?.data?.message || 'Erreur') }
  }

  const deleteEvent = async (id) => {
    if (!confirm('Supprimer cet événement ?')) return
    try {
      await api.delete(`/front/events/${id}`)
      loadEvents(selected)
      load()
    } catch {}
  }

  const resultatLabel = (r, camp) => {
    const labels = {
      win: camp === 'allemand' ? '🟢 Victoire DE' : '🔴 Victoire US',
      win_all: camp === 'allemand' ? '🟢🟢 Victoire totale DE' : '🔴🔴 Victoire totale US',
      lose: camp === 'allemand' ? '🟢 Victoire DE' : '🔴 Victoire US',
      lose_all: camp === 'allemand' ? '🟢🟢 Victoire totale DE' : '🔴🔴 Victoire totale US'
    }
    return labels[r] || r
  }

  const selectedCarte = cartes.find(c => c.id === selected)

  if (loading) return <div className="container"><p>Chargement...</p></div>

  return (
    <div className="container">
      <BackButton />
      <h2>⚔️ Situation du Front</h2>
      <p className="front-subtitle">État des opérations sur les différents théâtres</p>

      <div className="front-grid">
        {cartes.map(c => {
          const s = c.stats || {}
          const totalDE = (parseInt(s.att_win_de) || 0) + (parseInt(s.def_win_de) || 0)
          const totalUS = (parseInt(s.att_win_us) || 0) + (parseInt(s.def_win_us) || 0)
          const total = totalDE + totalUS
          const pctDE = total > 0 ? Math.round(totalDE / total * 100) : 50
          const isSelected = selected === c.id
          return (
            <div key={c.id} className={`front-card ${isSelected ? 'active' : ''}`} onClick={() => loadEvents(c.id)}>
              <h3>{c.nom}</h3>
              {c.description && <p className="front-card-desc">{c.description}</p>}
              <div className="front-bar">
                <div className="front-bar-de" style={{ width: `${pctDE}%` }}>{pctDE > 15 ? `${pctDE}%` : ''}</div>
                <div className="front-bar-us" style={{ width: `${100 - pctDE}%` }}>{(100 - pctDE) > 15 ? `${100 - pctDE}%` : ''}</div>
              </div>
              <div className="front-stats-row">
                <span>🇩🇪 {totalDE} victoires</span>
                <span>🇺🇸 {totalUS} victoires</span>
              </div>
              <div className="front-stats-detail">
                <span>⚔️ Att: {parseInt(s.att_win_de)||0} DE / {parseInt(s.att_win_us)||0} US</span>
                <span>🛡️ Déf: {parseInt(s.def_win_de)||0} DE / {parseInt(s.def_win_us)||0} US</span>
              </div>
              {c.dernierEvent && (
                <div className="front-last-event">
                  Dernier : {c.dernierEvent.type_event === 'attaque' ? '⚔️' : '🛡️'} {resultatLabel(c.dernierEvent.resultat, c.dernierEvent.camp_vainqueur)}
                  {c.dernierEvent.date_rp && ` — ${c.dernierEvent.date_rp}`}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selected && (
        <div className="front-detail">
          <h3>📋 Historique — {selectedCarte?.nom}</h3>
          {canReport && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: '1rem' }}>
              {showForm ? '✕ Annuler' : '+ Rapporter un événement'}
            </button>
          )}

          {showForm && (
            <form onSubmit={submitEvent} className="front-form paper-card">
              <div className="form-row">
                <label>Type</label>
                <select className="form-input" value={form.type_event} onChange={e => setForm(p => ({...p, type_event: e.target.value}))}>
                  <option value="attaque">⚔️ Attaque de base</option>
                  <option value="defense">🛡️ Défense de base</option>
                </select>
              </div>
              <div className="form-row">
                <label>Résultat</label>
                <select className="form-input" value={form.resultat} onChange={e => setForm(p => ({...p, resultat: e.target.value}))}>
                  <option value="win">Win (victoire partielle)</option>
                  <option value="win_all">Win All (victoire totale)</option>
                </select>
              </div>
              <div className="form-row">
                <label>Vainqueur</label>
                <select className="form-input" value={form.camp_vainqueur} onChange={e => setForm(p => ({...p, camp_vainqueur: e.target.value}))}>
                  <option value="allemand">🇩🇪 Allemand</option>
                  <option value="us">🇺🇸 US / Allié</option>
                </select>
              </div>
              <div className="form-row">
                <label>Date RP (libre)</label>
                <input className="form-input" value={form.date_rp} onChange={e => setForm(p => ({...p, date_rp: e.target.value}))} placeholder="ex: 15 Août 1944" />
              </div>
              <div className="form-row">
                <label>Note</label>
                <input className="form-input" value={form.note} onChange={e => setForm(p => ({...p, note: e.target.value}))} placeholder="Détails optionnels..." />
              </div>
              <button type="submit" className="btn btn-primary">📝 Enregistrer</button>
            </form>
          )}

          {events.length === 0 ? (
            <p className="muted">Aucun événement enregistré pour cette carte.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date IRL</th>
                  <th>Date RP</th>
                  <th>Type</th>
                  <th>Résultat</th>
                  <th>Rapporté par</th>
                  <th>Note</th>
                  {canDelete && <th></th>}
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id}>
                    <td>{new Date(ev.date_irl).toLocaleDateString('fr-FR')}</td>
                    <td>{ev.date_rp || '—'}</td>
                    <td>{ev.type_event === 'attaque' ? '⚔️ Attaque' : '🛡️ Défense'}</td>
                    <td>{resultatLabel(ev.resultat, ev.camp_vainqueur)}</td>
                    <td>{ev.rapporte_par_nom || '—'}</td>
                    <td>{ev.note || '—'}</td>
                    {canDelete && <td><button className="btn btn-danger btn-small" onClick={() => deleteEvent(ev.id)}>🗑️</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
