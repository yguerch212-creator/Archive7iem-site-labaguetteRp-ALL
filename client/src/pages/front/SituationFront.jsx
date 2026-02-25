import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import './situation-front.css'

const ICON = (ev) => {
  if (ev.type_event === 'debut') return '🔔'
  if (ev.type_event === 'fin') return '🏁'
  if (ev.type_event === 'defense' && ev.camp_vainqueur === 'allemand') return '⚠️'
  if (ev.type_event === 'defense' && ev.camp_vainqueur === 'us') return '❌'
  if (ev.type_event === 'attaque' && ev.camp_vainqueur === 'allemand') return '✅'
  if (ev.type_event === 'attaque' && ev.camp_vainqueur === 'us') return '⚠️✅'
  if (ev.type_event === 'prise') return '🚩'
  if (ev.type_event === 'perte') return '🏳️'
  return '•'
}
const LABEL = (ev) => {
  if (ev.type_event === 'debut') return 'Début des combats'
  if (ev.type_event === 'fin') return 'Fin des combats'
  if (ev.type_event === 'attaque') return `Attaque de base — Win ${ev.camp_vainqueur === 'allemand' ? 'ALL' : 'US'}`
  if (ev.type_event === 'defense') return `Défense de base — Win ${ev.camp_vainqueur === 'allemand' ? 'ALL' : 'US'}`
  const vpName = ev.vp_nom || `VP${ev.vp_numero || '?'}`
  if (ev.type_event === 'prise') return `Prise — ${vpName}`
  if (ev.type_event === 'perte') return `Perte — ${vpName}`
  return ''
}

// Berlin Mur Est (carte_id=1) has non-linear VP system:
// VP1 & VP2 independent → both needed for VP3 → VP3 needed for VP4 & VP5 (independent)
// All other maps are linear (1→2→3→4→5)
const NON_LINEAR_CARTE = 1 // Berlin Mur Est

// Returns array of held VP numbers
function getHeldVPs(events, vps, carteId) {
  if (!vps?.length) return []
  const sorted = [...events].filter(e => e.type_event === 'prise' || e.type_event === 'perte')
    .sort((a, b) => new Date(a.date_irl) - new Date(b.date_irl) || a.id - b.id)

  if (carteId === NON_LINEAR_CARTE) {
    // Track each VP independently
    const held = new Set()
    for (const ev of sorted) {
      const vpNum = ev.vp_numero || vps.find(v => v.id === ev.vp_id)?.numero || 0
      if (!vpNum) continue
      if (ev.type_event === 'prise') held.add(vpNum)
      if (ev.type_event === 'perte') held.delete(vpNum)
    }
    return [...held].sort((a, b) => a - b)
  }

  // Linear maps: highest VP held
  let currentVP = 0
  for (const ev of sorted) {
    const vpNum = ev.vp_numero || vps.find(v => v.id === ev.vp_id)?.numero || 0
    if (ev.type_event === 'prise' && vpNum > currentVP) currentVP = vpNum
    if (ev.type_event === 'perte' && vpNum <= currentVP) currentVP = vpNum - 1
  }
  return currentVP > 0 ? Array.from({ length: currentVP }, (_, i) => i + 1) : []
}

function HeureSelect({ value, onChange }) {
  return (
    <div className="front-heure-select">
      <button type="button" className={`front-heure-btn ${value === 'auto' ? 'active' : ''}`} onClick={() => onChange('auto')}>🕐 Auto</button>
      <button type="button" className={`front-heure-btn ${value === 'manual' ? 'active' : ''}`} onClick={() => onChange('manual')}>✏️ Manuel</button>
      <button type="button" className={`front-heure-btn ${value === 'inconnu' ? 'active' : ''}`} onClick={() => onChange('inconnu')}>❓ Inconnu</button>
    </div>
  )
}

export default function SituationFront() {
  const { user } = useAuth()
  const [cartes, setCartes] = useState([])
  const [selected, setSelected] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('report')
  const [flash, setFlash] = useState(null)
  const [heureMode, setHeureMode] = useState('auto')
  const [heureManuel, setHeureManuel] = useState('')
  const [histFilter, setHistFilter] = useState('jour') // jour | semaine | all
  const [histDate, setHistDate] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })

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

  const getHeure = () => {
    if (heureMode === 'auto') return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    if (heureMode === 'manual') return heureManuel || null
    return null // inconnu
  }

  const post = async (data) => {
    if (!selected) return
    try {
      await api.post(`/front/cartes/${selected}/events`, { ...data, heure: getHeure() })
      const label = data.type_event === 'prise' ? '🚩 Prise enregistrée'
        : data.type_event === 'perte' ? '🏳️ Perte enregistrée'
        : data.type_event === 'debut' ? '🔔 Début enregistré'
        : data.type_event === 'fin' ? '🏁 Fin enregistrée'
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

  // Extract YYYY-MM-DD reliably (local timezone for Date objects, raw slice for strings)
  const toDateStr = (d) => {
    if (!d) return ''
    if (typeof d === 'string') return d.slice(0, 10)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  // Filter events for history
  const filteredEvents = events.filter(ev => {
    if (histFilter === 'all') return true
    const evDate = toDateStr(ev.date_irl)
    if (histFilter === 'jour') {
      return evDate === histDate
    }
    // semaine = Monday to Sunday of the week containing histDate
    const ref = new Date(histDate + 'T12:00:00')
    const day = ref.getDay() || 7 // Sunday = 7
    const monday = new Date(ref); monday.setDate(ref.getDate() - day + 1)
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
    const monStr = toDateStr(monday)
    const sunStr = toDateStr(sunday)
    return evDate >= monStr && evDate <= sunStr
  })

  // Group by day
  const byDay = {}
  filteredEvents.forEach(ev => {
    const day = new Date(ev.date_irl).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(ev)
  })

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
          const total = attAll + attUs + defAll + defUs + (parseInt(s.prises) || 0) + (parseInt(s.pertes) || 0)
          const heldVPs = getHeldVPs(c.lastEvents || [], c.vps || [], c.id)
          return (
            <div key={c.id} className={`front-card ${selected === c.id ? 'active' : ''}`} onClick={() => openCarte(c.id)}>
              <h3>{c.nom}</h3>
              {heldVPs.length > 0 && <div className="front-vp-current">🚩 {heldVPs.map(n => {
                const vp = c.vps?.find(v => v.numero === n)
                return `VP${n}${vp?.nom ? ` ${vp.nom}` : ''}`
              }).join(' · ')}</div>}
              {heldVPs.length === 0 && total > 0 && <div className="front-vp-current" style={{color:'#8b8060'}}>Aucun VP tenu</div>}
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

      {/* Popup carte */}
      {selected && (
        <div className="popup-overlay" onClick={() => setSelected(null)}>
          <div className="popup-content front-popup" onClick={e => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setSelected(null)}>✕</button>
            <h3 className="front-popup-title">{sel?.nom}</h3>

            <div className="front-tabs">
              <button className={`front-tab ${tab==='report'?'active':''}`} onClick={() => setTab('report')}>📝 Rapporter</button>
              <button className={`front-tab ${tab==='history'?'active':''}`} onClick={() => setTab('history')}>📋 Historique ({events.length})</button>
            </div>

            {flash && <div className="front-flash">{flash}</div>}

            {tab === 'report' && canReport && (
              <div className="front-actions">
                {/* Heure selector */}
                <div className="front-section">
                  <p className="front-section-label">🕐 Heure</p>
                  <HeureSelect value={heureMode} onChange={setHeureMode} />
                  {heureMode === 'manual' && (
                    <input type="time" className="form-input" value={heureManuel} onChange={e => setHeureManuel(e.target.value)} style={{ marginTop: '0.3rem', maxWidth: 140 }} />
                  )}
                </div>

                {/* Début / Fin combats */}
                <div className="front-section">
                  <p className="front-section-label">🔔 Combats</p>
                  <div className="front-btn-row">
                    <button className="front-btn front-btn-combat" onClick={() => post({ type_event: 'debut', resultat: 'vp' })}>🔔 Début des combats</button>
                    <button className="front-btn front-btn-combat" onClick={() => post({ type_event: 'fin', resultat: 'vp' })}>🏁 Fin des combats</button>
                  </div>
                </div>

                {/* Bases */}
                <div className="front-section">
                  <p className="front-section-label">🇩🇪 Défense de base allemande</p>
                  <div className="front-btn-row">
                    <button className="front-btn front-btn-warn" onClick={() => post({ type_event: 'defense', resultat: 'win_all', camp_vainqueur: 'allemand' })}>⚠️ Win ALL</button>
                    <button className="front-btn front-btn-lose" onClick={() => post({ type_event: 'defense', resultat: 'win', camp_vainqueur: 'us' })}>❌ Win US</button>
                  </div>
                </div>

                <div className="front-section">
                  <p className="front-section-label">🇺🇸 Attaque de base américaine</p>
                  <div className="front-btn-row">
                    <button className="front-btn front-btn-de" onClick={() => post({ type_event: 'attaque', resultat: 'win_all', camp_vainqueur: 'allemand' })}>✅ Win ALL</button>
                    <button className="front-btn front-btn-warn2" onClick={() => post({ type_event: 'attaque', resultat: 'win', camp_vainqueur: 'us' })}>⚠️✅ Win US</button>
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

            {tab === 'history' && (
              <div className="front-history">
                {/* Filter bar */}
                <div className="front-hist-filter">
                  <select className="form-input" value={histFilter} onChange={e => setHistFilter(e.target.value)} style={{ maxWidth: 130 }}>
                    <option value="jour">📅 Jour</option>
                    <option value="semaine">📆 Semaine</option>
                    <option value="all">📋 Tout</option>
                  </select>
                  {histFilter !== 'all' && (
                    <input type="date" className="form-input" value={histDate} onChange={e => setHistDate(e.target.value)} style={{ maxWidth: 170 }} />
                  )}
                </div>

                {filteredEvents.length === 0 ? (
                  <p className="muted" style={{textAlign:'center'}}>Aucun événement pour cette période.</p>
                ) : Object.entries(byDay).map(([day, dayEvents]) => (
                  <div key={day}>
                    <p className="front-day-label">{day}</p>
                    {dayEvents.map(ev => (
                      <div key={ev.id} className="front-event-row">
                        <div className="front-event-main">
                          <span>{ICON(ev)}</span>
                          <span className="front-event-label">{LABEL(ev)}</span>
                          <span className="front-event-time">{ev.heure || '??h??'}</span>
                        </div>
                        <div className="front-event-meta">
                          {ev.rapporte_par_nom && <span>{ev.rapporte_par_nom}</span>}
                          {canDelete && <button className="front-del" onClick={() => deleteEvent(ev.id)}>🗑️</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Rapport summary at bottom */}
                {filteredEvents.length > 0 && (() => {
                  const s = {
                    att_all: filteredEvents.filter(e => e.type_event === 'attaque' && e.camp_vainqueur === 'allemand').length,
                    att_us: filteredEvents.filter(e => e.type_event === 'attaque' && e.camp_vainqueur === 'us').length,
                    def_all: filteredEvents.filter(e => e.type_event === 'defense' && e.camp_vainqueur === 'allemand').length,
                    def_us: filteredEvents.filter(e => e.type_event === 'defense' && e.camp_vainqueur === 'us').length,
                    prises: filteredEvents.filter(e => e.type_event === 'prise').length,
                    pertes: filteredEvents.filter(e => e.type_event === 'perte').length,
                  }
                  const nbAtt = s.att_all + s.att_us
                  const nbDef = s.def_all + s.def_us
                  const bat = nbAtt + nbDef
                  return (
                    <div className="front-rapport-summary">
                      <p className="front-section-label">📊 Résumé</p>
                      <div className="front-rapport-grid">
                        <span>⚔️ Batailles: {bat}</span>
                        <span>🗡️ Attaques: {nbAtt}</span>
                        <span>🛡️ Défenses: {nbDef}</span>
                        <span>✅ Win ALL att: {s.att_all}</span>
                        <span>⚠️✅ Win US att: {s.att_us}</span>
                        <span>⚠️ Win ALL déf: {s.def_all}</span>
                        <span>❌ Win US déf: {s.def_us}</span>
                        <span>🚩 Prises: {s.prises}</span>
                        <span>🏳️ Pertes: {s.pertes}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
