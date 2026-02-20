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
  const [tab, setTab] = useState('report')

  const canReport = user?.isAdmin || user?.isOfficier || user?.isSousOfficier || user?.isEtatMajor
  const canDelete = user?.isAdmin || user?.isOfficier || user?.isEtatMajor || user?.isRecenseur

  const load = async () => {
    try { const r = await api.get('/front/cartes'); setCartes(r.data.data) }
    catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openCarte = async (id) => {
    setSelected(id); setTab('report')
    try { const r = await api.get(`/front/cartes/${id}/events`); setEvents(r.data.data) }
    catch { setEvents([]) }
  }

  const [flash, setFlash] = useState(null)

  const post = async (data) => {
    if (!selected) return
    const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    try {
      await api.post(`/front/cartes/${selected}/events`, { ...data, heure })
      // Flash confirmation then switch to history
      const label = data.type_event === 'prise' ? '🚩 Prise enregistrée' 
        : data.type_event === 'perte' ? '🏳️ Perte enregistrée'
        : data.type_event === 'attaque' ? '⚔️ Attaque enregistrée'
        : '🛡️ Défense enregistrée'
      setFlash(label)
      setTimeout(() => setFlash(null), 2500)
      setTab('history')
      const r = await api.get(`/front/cartes/${selected}/events`); setEvents(r.data.data)
      load()
    } catch (err) { alert(err.response?.data?.message || 'Erreur') }
  }

  const deleteEvent = async (id) => {
    if (!confirm('Supprimer ?')) return
    try { await api.delete(`/front/events/${id}`); openCarte(selected); load() } catch {}
  }

  const sel = cartes.find(c => c.id === selected)

  const eventIcon = (ev) => {
    if (ev.type_event === 'attaque') return ev.camp_vainqueur === 'allemand' ? '✅' : '✅'
    if (ev.type_event === 'defense') return ev.camp_vainqueur === 'allemand' ? '⚠️✅' : '⚠️✅'
    if (ev.type_event === 'prise') return '🚩'
    if (ev.type_event === 'perte') return '🏳️'
    return '•'
  }
  const eventLabel = (ev) => {
    if (ev.type_event === 'attaque') return `Attaque de base — Win ${ev.camp_vainqueur === 'allemand' ? 'ALL' : 'US'}`
    if (ev.type_event === 'defense') return `Défense de base — Win ${ev.camp_vainqueur === 'allemand' ? 'ALL' : 'US'}`
    const vpName = ev.vp_nom || `VP${ev.vp_numero || '?'}`
    if (ev.type_event === 'prise') return `Prise — ${vpName}`
    if (ev.type_event === 'perte') return `Perte — ${vpName}`
    return ''
  }

  if (loading) return <div className="container"><p>Chargement...</p></div>

  return (
    <div className="container">
      <BackButton />
      <h2>⚔️ Situation du Front</h2>

      <div className="front-grid">
        {cartes.map(c => {
          const s = c.stats || {}
          const attAll = parseInt(s.att_all) || 0, attUs = parseInt(s.att_us) || 0
          const defAll = parseInt(s.def_all) || 0, defUs = parseInt(s.def_us) || 0
          const total = attAll + attUs + defAll + defUs
          return (
            <div key={c.id} className={`front-card ${selected === c.id ? 'active' : ''}`} onClick={() => openCarte(c.id)}>
              <h3>{c.nom}</h3>
              {total > 0 ? (
                <div className="front-card-stats">
                  <span>⚔️ Att: {attAll} ALL / {attUs} US</span>
                  <span>🛡️ Déf: {defAll} ALL / {defUs} US</span>
                  <span>🚩 {parseInt(s.prises)||0} prises · 🏳️ {parseInt(s.pertes)||0} pertes</span>
                </div>
              ) : <p className="muted" style={{margin:'0.3rem 0 0',fontSize:'0.8rem'}}>Aucun événement</p>}
            </div>
          )
        })}
      </div>

      {selected && (
        <div className="popup-overlay" onClick={() => setSelected(null)}>
          <div className="popup-content front-popup" onClick={e => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setSelected(null)}>✕</button>
            <h3 style={{margin:'0 0 0.75rem',textAlign:'center'}}>{sel?.nom}</h3>

            <div className="front-tabs">
              <button className={`front-tab ${tab==='report'?'active':''}`} onClick={() => setTab('report')}>📝 Rapporter</button>
              <button className={`front-tab ${tab==='history'?'active':''}`} onClick={() => setTab('history')}>📋 Historique ({events.length})</button>
            </div>

            {flash && <div style={{ padding: '0.5rem 0.75rem', marginBottom: '0.75rem', background: 'rgba(107,143,60,0.15)', border: '1px solid rgba(107,143,60,0.4)', borderRadius: 6, textAlign: 'center', fontWeight: 'bold', color: '#8bc34a' }}>{flash}</div>}

            {tab === 'report' && canReport && (
              <div className="front-actions">
                {/* Bases */}
                <div className="front-section">
                  <p className="front-section-label">🇩🇪 Défense de base allemande</p>
                  <div className="front-btn-row">
                    <button className="front-btn front-btn-de" onClick={() => post({ type_event: 'defense', resultat: 'win_all', camp_vainqueur: 'allemand' })}>✅ Win ALL</button>
                    <button className="front-btn front-btn-us" onClick={() => post({ type_event: 'defense', resultat: 'win', camp_vainqueur: 'us' })}>⚠️✅ Win US</button>
                  </div>
                </div>

                <div className="front-section">
                  <p className="front-section-label">🇺🇸 Attaque de base américaine</p>
                  <div className="front-btn-row">
                    <button className="front-btn front-btn-de" onClick={() => post({ type_event: 'attaque', resultat: 'win_all', camp_vainqueur: 'allemand' })}>✅ Win ALL</button>
                    <button className="front-btn front-btn-us" onClick={() => post({ type_event: 'attaque', resultat: 'win', camp_vainqueur: 'us' })}>✅ Win US</button>
                  </div>
                </div>

                {/* VPs */}
                {sel?.vps?.length > 0 && (
                  <div className="front-section">
                    <p className="front-section-label">🚩 Avant-postes (VP)</p>
                    <div className="front-vp-grid">
                      {sel.vps.map(vp => (
                        <div key={vp.id} className="front-vp-item">
                          <span className="front-vp-name">VP{vp.numero}{vp.nom ? ` — ${vp.nom}` : ''}</span>
                          <div className="front-vp-btns">
                            <button className="front-btn-sm front-btn-prise" onClick={() => post({ type_event: 'prise', resultat: 'vp', vp_id: vp.id })}>🚩 Prise</button>
                            <button className="front-btn-sm front-btn-perte" onClick={() => post({ type_event: 'perte', resultat: 'vp', vp_id: vp.id })}>🏳️ Perte</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {tab === 'report' && !canReport && (
              <p className="muted" style={{textAlign:'center',padding:'1rem'}}>Seuls les officiers/SO peuvent rapporter.</p>
            )}

            {tab === 'history' && (() => {
              // Group events by day
              const byDay = {}
              events.forEach(ev => {
                const day = new Date(ev.date_irl).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                if (!byDay[day]) byDay[day] = []
                byDay[day].push(ev)
              })
              return (
              <div className="front-history">
                {events.length === 0 ? (
                  <p className="muted" style={{textAlign:'center'}}>Aucun événement.</p>
                ) : Object.entries(byDay).map(([day, dayEvents]) => (
                  <div key={day}>
                    <p className="front-day-label">{day}</p>
                    {dayEvents.map(ev => (
                  <div key={ev.id} className="front-event-row">
                    <div className="front-event-main">
                      <span>{eventIcon(ev)}</span>
                      <span className="front-event-label">{eventLabel(ev)}</span>
                      {ev.heure && <span className="front-event-time">{ev.heure}</span>}
                    </div>
                    <div className="front-event-meta">
                      {ev.rapporte_par_nom && <span>{ev.rapporte_par_nom}</span>}
                      {canDelete && <button className="front-del" onClick={() => deleteEvent(ev.id)}>🗑️</button>}
                    </div>
                  </div>
                ))}
                  </div>
                ))}
              </div>
              )})()}
          </div>
        </div>
      )}
    </div>
  )
}
