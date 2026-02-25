import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import html2canvas from 'html2canvas'
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

// Returns { heldVPs: number[], status: 'vp'|'fin'|'stale'|'none' }
function getCarteStatus(events, vps, carteId) {
  if (!vps?.length || !events?.length) return { heldVPs: [], status: 'none' }

  const sorted = [...events].sort((a, b) => new Date(a.date_irl) - new Date(b.date_irl) || a.id - b.id)
  const last = sorted[sorted.length - 1]

  // Check if last event is "fin des combats" → cessez-le-feu
  if (last?.type_event === 'fin') return { heldVPs: [], status: 'fin' }

  // Check if last event is stale (from a previous day, cutoff at 3AM)
  if (last?.date_irl) {
    const lastDate = new Date(last.date_irl)
    const now = new Date()
    // "Today" starts at 3AM — if last event was before today's 3AM, it's stale
    const cutoff = new Date(now)
    cutoff.setHours(3, 0, 0, 0)
    if (now.getHours() < 3) cutoff.setDate(cutoff.getDate() - 1) // before 3AM, cutoff is yesterday 3AM
    if (lastDate < cutoff) return { heldVPs: [], status: 'stale' }
  }

  const vpEvents = sorted.filter(e => e.type_event === 'prise' || e.type_event === 'perte')
  const heldVPs = computeHeldVPs(vpEvents, vps, carteId)
  return { heldVPs, status: heldVPs.length > 0 ? 'vp' : 'none' }
}

function computeHeldVPs(vpEvents, vps, carteId) {
  if (carteId === NON_LINEAR_CARTE) {
    const held = new Set()
    for (const ev of vpEvents) {
      const vpNum = ev.vp_numero || vps.find(v => v.id === ev.vp_id)?.numero || 0
      if (!vpNum) continue
      if (ev.type_event === 'prise') held.add(vpNum)
      if (ev.type_event === 'perte') held.delete(vpNum)
    }
    return [...held].sort((a, b) => a - b)
  }
  // Linear
  let currentVP = 0
  for (const ev of vpEvents) {
    const vpNum = ev.vp_numero || vps.find(v => v.id === ev.vp_id)?.numero || 0
    if (ev.type_event === 'prise' && vpNum > currentVP) currentVP = vpNum
    if (ev.type_event === 'perte' && vpNum <= currentVP) currentVP = vpNum - 1
  }
  return currentVP > 0 ? Array.from({ length: currentVP }, (_, i) => i + 1) : []
}

// RP week: Friday 20h → Friday 20h
function getRPWeekRange(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay() // 0=Sun ... 5=Fri 6=Sat
  // Find previous Friday (or current if Friday)
  let fridayStart = new Date(d)
  const diff = day >= 5 ? day - 5 : day + 2 // days since last Friday
  fridayStart.setDate(d.getDate() - diff)
  let fridayEnd = new Date(fridayStart)
  fridayEnd.setDate(fridayStart.getDate() + 7)
  return {
    start: fridayStart,
    end: fridayEnd,
    label: `${fridayStart.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})} — ${fridayEnd.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})}`
  }
}

// Sort events: "debut" always first in its day, "fin" always last, rest by time
// Sort: newest first overall. Within same day: fin on top (most recent), début at bottom (earliest).
function sortEvents(events) {
  return [...events].sort((a, b) => {
    const dayA = (a.date_irl || '').slice(0, 10)
    const dayB = (b.date_irl || '').slice(0, 10)
    if (dayA !== dayB) return dayB.localeCompare(dayA) // newest day first
    // Within same day: newest on top, BUT début pinned to bottom, fin pinned to top
    if (a.type_event === 'fin' && b.type_event !== 'fin') return -1
    if (b.type_event === 'fin' && a.type_event !== 'fin') return 1
    if (a.type_event === 'debut' && b.type_event !== 'debut') return 1
    if (b.type_event === 'debut' && a.type_event !== 'debut') return -1
    return new Date(b.date_irl) - new Date(a.date_irl) // newest first
  })
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
  const weekRef = useRef(null)

  const exportWeekPng = async () => {
    if (!weekRef.current) return
    const canvas = await html2canvas(weekRef.current, { scale: 2, backgroundColor: '#1e1c18', logging: false })
    const link = document.createElement('a')
    link.download = `rapport-front-${rpWeek.label.replace(/[/ ]/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

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
    const heure = getHeure()
    const label = data.type_event === 'prise' ? '🚩 Prise enregistrée'
      : data.type_event === 'perte' ? '🏳️ Perte enregistrée'
      : data.type_event === 'debut' ? '🔔 Début enregistré'
      : data.type_event === 'fin' ? '🏁 Fin enregistrée'
      : data.type_event === 'attaque' ? '⚔️ Attaque enregistrée'
      : '🛡️ Défense enregistrée'

    // Optimistic: add event locally immediately
    const now = new Date()
    const tempId = Date.now()
    const vp = sel?.vps?.find(v => v.id === data.vp_id)
    const optimisticEvent = {
      id: tempId, carte_id: selected, ...data, heure,
      date_irl: now.toISOString(), vp_nom: vp?.nom || null, vp_numero: vp?.numero || null,
      rapporte_par_nom: user?.prenom ? `${user.prenom} ${user.nom}` : null
    }
    setEvents(prev => [optimisticEvent, ...prev])
    setFlash(label)
    setTimeout(() => setFlash(null), 2500)
    setTab('history')

    try {
      const r = await api.post(`/front/cartes/${selected}/events`, { ...data, heure })
      // Replace temp event with real one (with server ID)
      setEvents(prev => prev.map(e => e.id === tempId ? { ...e, id: r.data.data.id } : e))
      load() // refresh cartes stats in background
    } catch (err) {
      // Rollback on error
      setEvents(prev => prev.filter(e => e.id !== tempId))
      alert(err.response?.data?.message || 'Erreur')
    }
  }

  const deleteEvent = async (id) => {
    if (!confirm('Supprimer ?')) return
    // Optimistic: remove locally first
    const backup = events.find(e => e.id === id)
    setEvents(prev => prev.filter(e => e.id !== id))
    try {
      await api.delete(`/front/events/${id}`)
      load() // refresh carte stats
    } catch {
      // Rollback
      if (backup) setEvents(prev => [...prev, backup].sort((a, b) => new Date(b.date_irl) - new Date(a.date_irl)))
    }
  }

  const sel = cartes.find(c => c.id === selected)

  // Extract YYYY-MM-DD reliably (local timezone for Date objects, raw slice for strings)
  const toDateStr = (d) => {
    if (!d) return ''
    if (typeof d === 'string') return d.slice(0, 10)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  // Date navigation helpers
  const shiftDate = (days) => {
    const d = new Date(histDate + 'T12:00:00')
    d.setDate(d.getDate() + days)
    setHistDate(toDateStr(d))
  }
  const isToday = histDate === toDateStr(new Date())
  const rpWeek = getRPWeekRange(histDate)

  // Filter events for history
  const filteredEvents = events.filter(ev => {
    if (histFilter === 'all') return true
    const evDate = toDateStr(ev.date_irl)
    if (histFilter === 'jour') return evDate === histDate
    // Semaine RP: Friday → Friday
    return evDate >= toDateStr(rpWeek.start) && evDate < toDateStr(rpWeek.end)
  })

  // Sort with debut first, fin last per day
  const sortedFiltered = sortEvents(filteredEvents)

  // Group by day
  const byDay = {}
  sortedFiltered.forEach(ev => {
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
          const { heldVPs, status } = getCarteStatus(c.lastEvents || [], c.vps || [], c.id)
          return (
            <div key={c.id} className={`front-card ${selected === c.id ? 'active' : ''}`} onClick={() => openCarte(c.id)}>
              <h3>{c.nom}</h3>
              {status === 'fin' && <div className="front-vp-current" style={{color:'#90b0d0'}}>🏁 Cessez-le-feu</div>}
              {status === 'stale' && <div className="front-vp-current" style={{color:'#8b8060',fontSize:'0.8rem'}}>Aucun combat en cours</div>}
              {status === 'vp' && <div className="front-vp-current">🚩 {(() => {
                // Berlin Mur Est: condense display — show front line position
                if (c.id === NON_LINEAR_CARTE) {
                  const has = (n) => heldVPs.includes(n)
                  // VP4+VP5 held → show both (independent)
                  // VP3 held → show VP3 (implies VP1+VP2)
                  // VP1 or VP2 → show only what's held at that level
                  const parts = []
                  if (has(4) || has(5)) {
                    if (has(4)) { const v = c.vps?.find(x=>x.numero===4); parts.push(`VP4${v?.nom ? ` ${v.nom}` : ''}`) }
                    if (has(5)) { const v = c.vps?.find(x=>x.numero===5); parts.push(`VP5${v?.nom ? ` ${v.nom}` : ''}`) }
                  } else if (has(3)) {
                    const v = c.vps?.find(x=>x.numero===3); parts.push(`VP3${v?.nom ? ` ${v.nom}` : ''}`)
                  } else {
                    if (has(1)) { const v = c.vps?.find(x=>x.numero===1); parts.push(`VP1${v?.nom ? ` ${v.nom}` : ''}`) }
                    if (has(2)) { const v = c.vps?.find(x=>x.numero===2); parts.push(`VP2${v?.nom ? ` ${v.nom}` : ''}`) }
                  }
                  return parts.join(' · ')
                }
                // Linear maps: just show highest VP
                const highest = Math.max(...heldVPs)
                const vp = c.vps?.find(v => v.numero === highest)
                return `VP${highest}${vp?.nom ? ` ${vp.nom}` : ''}`
              })()}</div>}
              {status === 'none' && total > 0 && <div className="front-vp-current" style={{color:'#8b8060'}}>Aucun VP tenu</div>}
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
                  <div className="front-filter-tabs">
                    <button className={`front-ftab ${histFilter==='jour'?'active':''}`} onClick={() => setHistFilter('jour')}>📅 Jour</button>
                    <button className={`front-ftab ${histFilter==='semaine'?'active':''}`} onClick={() => setHistFilter('semaine')}>📆 Semaine RP</button>
                    <button className={`front-ftab ${histFilter==='all'?'active':''}`} onClick={() => setHistFilter('all')}>📋 Tout</button>
                  </div>
                  {histFilter !== 'all' && (
                    <div className="front-date-nav">
                      <button className="front-nav-btn" onClick={() => shiftDate(histFilter === 'jour' ? -1 : -7)}>◀</button>
                      <button className={`front-nav-today ${isToday ? 'active' : ''}`} onClick={() => setHistDate(toDateStr(new Date()))}>Aujourd'hui</button>
                      <button className="front-nav-btn" onClick={() => shiftDate(histFilter === 'jour' ? 1 : 7)}>▶</button>
                      <input type="date" className="form-input front-date-pick" value={histDate} onChange={e => setHistDate(e.target.value)} />
                    </div>
                  )}
                  {histFilter === 'jour' && (
                    <div className="front-date-label">{new Date(histDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  )}
                  {histFilter === 'semaine' && (
                    <div className="front-date-label">Semaine RP : {rpWeek.label}</div>
                  )}
                </div>

                {sortedFiltered.length === 0 ? (
                  <p className="muted" style={{textAlign:'center'}}>Aucun événement pour cette période.</p>
                ) : histFilter === 'semaine' ? (
                  /* Semaine RP: summary only */
                  (() => {
                    const s = {
                      att_all: sortedFiltered.filter(e => e.type_event === 'attaque' && e.camp_vainqueur === 'allemand').length,
                      att_us: sortedFiltered.filter(e => e.type_event === 'attaque' && e.camp_vainqueur === 'us').length,
                      def_all: sortedFiltered.filter(e => e.type_event === 'defense' && e.camp_vainqueur === 'allemand').length,
                      def_us: sortedFiltered.filter(e => e.type_event === 'defense' && e.camp_vainqueur === 'us').length,
                      prises: sortedFiltered.filter(e => e.type_event === 'prise').length,
                      pertes: sortedFiltered.filter(e => e.type_event === 'perte').length,
                      debuts: sortedFiltered.filter(e => e.type_event === 'debut').length,
                      fins: sortedFiltered.filter(e => e.type_event === 'fin').length,
                    }
                    const nbAtt = s.att_all + s.att_us
                    const nbDef = s.def_all + s.def_us
                    const bat = nbAtt + nbDef
                    const vicAll = s.att_all + s.def_all
                    const vicUs = s.att_us + s.def_us
                    return (
                      <div className="front-week-summary" ref={weekRef}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p className="front-section-label">📊 Rapport — {sel?.nom}</p>
                          <button className="front-nav-btn" onClick={exportWeekPng} title="Télécharger en PNG">📥</button>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#8b8060', margin: '0 0 0.5rem' }}>Semaine RP : {rpWeek.label}</p>
                        <div className="front-week-grid">
                          <div className="front-week-stat"><span className="front-week-num">{s.debuts}</span><span className="front-week-label">🔔 Sessions</span></div>
                          <div className="front-week-stat"><span className="front-week-num">{bat}</span><span className="front-week-label">⚔️ Batailles</span></div>
                          <div className="front-week-stat"><span className="front-week-num">{nbAtt}</span><span className="front-week-label">🗡️ Attaques</span></div>
                          <div className="front-week-stat"><span className="front-week-num">{nbDef}</span><span className="front-week-label">🛡️ Défenses</span></div>
                          <div className="front-week-stat"><span className="front-week-num" style={{color:'#8bc34a'}}>{vicAll}</span><span className="front-week-label">🏆 Win ALL</span></div>
                          <div className="front-week-stat"><span className="front-week-num" style={{color:'#e57373'}}>{vicUs}</span><span className="front-week-label">🏆 Win US</span></div>
                          <div className="front-week-stat"><span className="front-week-num">{s.prises}</span><span className="front-week-label">🚩 Prises VP</span></div>
                          <div className="front-week-stat"><span className="front-week-num" style={{color:'#e57373'}}>{s.pertes}</span><span className="front-week-label">🏳️ Pertes VP</span></div>
                          <div className="front-week-stat"><span className="front-week-num">{bat > 0 ? Math.round(vicAll / bat * 100) : 0}%</span><span className="front-week-label">Taux victoire</span></div>
                        </div>
                        {bat > 0 && (
                          <div className="front-week-details">
                            <p>✅ Win ALL att: {s.att_all} · ⚠️✅ Win US att: {s.att_us}</p>
                            <p>⚠️ Win ALL déf: {s.def_all} · ❌ Win US déf: {s.def_us}</p>
                            <p>Bilan VP: +{s.prises} / -{s.pertes} ({s.prises - s.pertes >= 0 ? '+' : ''}{s.prises - s.pertes} net)</p>
                          </div>
                        )}
                      </div>
                    )
                  })()
                ) : (
                  /* Jour / Tout: day-by-day events */
                  <>
                    {Object.entries(byDay).map(([day, dayEvents]) => (
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
                    {/* Summary for jour */}
                    {sortedFiltered.length > 0 && (() => {
                      const s = {
                        att_all: sortedFiltered.filter(e => e.type_event === 'attaque' && e.camp_vainqueur === 'allemand').length,
                        att_us: sortedFiltered.filter(e => e.type_event === 'attaque' && e.camp_vainqueur === 'us').length,
                        def_all: sortedFiltered.filter(e => e.type_event === 'defense' && e.camp_vainqueur === 'allemand').length,
                        def_us: sortedFiltered.filter(e => e.type_event === 'defense' && e.camp_vainqueur === 'us').length,
                        prises: sortedFiltered.filter(e => e.type_event === 'prise').length,
                        pertes: sortedFiltered.filter(e => e.type_event === 'perte').length,
                      }
                      const nbAtt = s.att_all + s.att_us
                      const nbDef = s.def_all + s.def_us
                      const bat = nbAtt + nbDef
                      if (bat === 0 && s.prises === 0 && s.pertes === 0) return null
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
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
