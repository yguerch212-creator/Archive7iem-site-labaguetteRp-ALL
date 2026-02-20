import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import './situation-front.css'

const LABEL = (type_event, resultat, camp) => {
  const isDefeat = resultat === 'lose' || resultat === 'lose_all'
  const side = camp === 'allemand' ? 'DE' : 'US'
  if (isDefeat) return `❌ Défaite ${side}`
  if (type_event === 'attaque') return `✅ Victoire ${side}`
  return `⚠️✅ Vic. défensive ${side}`
}

export default function SituationFront() {
  const { user } = useAuth()
  const [cartes, setCartes] = useState([])
  const [selected, setSelected] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('report') // 'report' | 'history'

  const canReport = user?.isAdmin || user?.isOfficier || user?.isSousOfficier || user?.isEtatMajor
  const canDelete = user?.isAdmin || user?.isOfficier || user?.isEtatMajor

  const load = async () => {
    try { const r = await api.get('/front/cartes'); setCartes(r.data.data) }
    catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openCarte = async (id) => {
    setSelected(id)
    setTab('report')
    try { const r = await api.get(`/front/cartes/${id}/events`); setEvents(r.data.data) }
    catch { setEvents([]) }
  }

  const report = async (type_event, camp_vainqueur) => {
    if (!selected) return
    const resultat = type_event === 'attaque' ? 'win_all' : 'win'
    try {
      await api.post(`/front/cartes/${selected}/events`, { type_event, resultat, camp_vainqueur })
      openCarte(selected)
      load()
    } catch (err) { alert(err.response?.data?.message || 'Erreur') }
  }

  const reportDefeat = async (camp_vainqueur) => {
    if (!selected) return
    try {
      await api.post(`/front/cartes/${selected}/events`, { type_event: 'attaque', resultat: 'lose', camp_vainqueur })
      openCarte(selected)
      load()
    } catch (err) { alert(err.response?.data?.message || 'Erreur') }
  }

  const deleteEvent = async (id) => {
    if (!confirm('Supprimer ?')) return
    try { await api.delete(`/front/events/${id}`); openCarte(selected); load() } catch {}
  }

  const sel = cartes.find(c => c.id === selected)

  if (loading) return <div className="container"><p>Chargement...</p></div>

  return (
    <div className="container">
      <BackButton />
      <h2>⚔️ Situation du Front</h2>

      <div className="front-grid">
        {cartes.map(c => {
          const s = c.stats || {}
          const totalDE = (parseInt(s.att_win_de) || 0) + (parseInt(s.def_win_de) || 0)
          const totalUS = (parseInt(s.att_win_us) || 0) + (parseInt(s.def_win_us) || 0)
          const total = totalDE + totalUS
          const pctDE = total > 0 ? Math.round(totalDE / total * 100) : 50
          return (
            <div key={c.id} className={`front-card ${selected === c.id ? 'active' : ''}`} onClick={() => openCarte(c.id)}>
              <h3>{c.nom}</h3>
              {total > 0 && <>
                <div className="front-bar">
                  <div className="front-bar-de" style={{ width: `${pctDE}%` }}>{pctDE > 10 ? `${pctDE}%` : ''}</div>
                  <div className="front-bar-us" style={{ width: `${100 - pctDE}%` }}>{(100 - pctDE) > 10 ? `${100 - pctDE}%` : ''}</div>
                </div>
                <div className="front-stats-row">
                  <span>🇩🇪 {totalDE} vic. / {parseInt(s.defeat_de)||0} déf.</span>
                  <span>🇺🇸 {totalUS} vic. / {parseInt(s.defeat_us)||0} déf.</span>
                </div>
              </>}
              {!total && <p className="muted" style={{margin:'0.5rem 0 0',fontSize:'0.8rem'}}>Aucun événement</p>}
            </div>
          )
        })}
      </div>

      {/* Popup carte */}
      {selected && (
        <div className="popup-overlay" onClick={() => setSelected(null)}>
          <div className="popup-content front-popup" onClick={e => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setSelected(null)}>✕</button>
            <h3 style={{margin:'0 0 1rem',textAlign:'center'}}>{sel?.nom}</h3>

            <div className="front-tabs">
              <button className={`front-tab ${tab==='report'?'active':''}`} onClick={() => setTab('report')}>📝 Rapporter</button>
              <button className={`front-tab ${tab==='history'?'active':''}`} onClick={() => setTab('history')}>📋 Historique ({events.length})</button>
            </div>

            {tab === 'report' && canReport && (
              <div className="front-actions">
                <p className="front-section-label">⚔️ Attaque de base</p>
                <div className="front-btn-row">
                  <button className="front-btn front-btn-de" onClick={() => report('attaque', 'allemand')}>✅ Victoire 🇩🇪</button>
                  <button className="front-btn front-btn-us" onClick={() => report('attaque', 'us')}>✅ Victoire 🇺🇸</button>
                </div>

                <p className="front-section-label">🛡️ Défense de base</p>
                <div className="front-btn-row">
                  <button className="front-btn front-btn-de" onClick={() => report('defense', 'allemand')}>⚠️✅ Vic. défensive 🇩🇪</button>
                  <button className="front-btn front-btn-us" onClick={() => report('defense', 'us')}>⚠️✅ Vic. défensive 🇺🇸</button>
                </div>

                <p className="front-section-label">❌ Défaite</p>
                <div className="front-btn-row">
                  <button className="front-btn front-btn-lose" onClick={() => reportDefeat('us')}>❌ Défaite (US gagne)</button>
                  <button className="front-btn front-btn-lose-de" onClick={() => reportDefeat('allemand')}>❌ Défaite (DE gagne)</button>
                </div>
              </div>
            )}
            {tab === 'report' && !canReport && (
              <p className="muted" style={{textAlign:'center',padding:'1rem'}}>Seuls les officiers/SO peuvent rapporter.</p>
            )}

            {tab === 'history' && (
              <div className="front-history">
                {events.length === 0 ? (
                  <p className="muted" style={{textAlign:'center'}}>Aucun événement.</p>
                ) : events.map(ev => (
                  <div key={ev.id} className="front-event-row">
                    <div className="front-event-info">
                      <span className="front-event-type">{ev.type_event === 'attaque' ? '⚔️' : '🛡️'}</span>
                      <span>{LABEL(ev.type_event, ev.resultat, ev.camp_vainqueur)}</span>
                    </div>
                    <div className="front-event-meta">
                      <span>{new Date(ev.date_irl).toLocaleDateString('fr-FR')}</span>
                      {ev.rapporte_par_nom && <span>— {ev.rapporte_par_nom}</span>}
                      {ev.note && <span className="muted">({ev.note})</span>}
                      {canDelete && <button className="btn btn-danger btn-small" onClick={() => deleteEvent(ev.id)} style={{padding:'2px 6px',fontSize:'0.7rem'}}>🗑️</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
