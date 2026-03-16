import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import { exportToPdf, exportToImage } from '../../utils/exportPdf'

// ── Helpers ──
function parseCreneaux(text) {
  if (!text || text.trim().toUpperCase() === 'X' || text.trim() === '') return 0
  let total = 0
  const normalized = text.replace(/[Hh]/g, 'h').replace(/\s*-\s*/g, '-')
  for (const slot of normalized.split(',').map(s => s.trim()).filter(Boolean)) {
    const m = slot.match(/(\d{1,2})(?:h(\d{0,2}))?\s*-\s*(\d{1,2})(?:h(\d{0,2}))?/)
    if (m) { const s = parseInt(m[1]) + (parseInt(m[2] || 0) / 60), e = parseInt(m[3]) + (parseInt(m[4] || 0) / 60); if (e > s) total += (e - s) }
  }
  return Math.round(total * 100) / 100
}

// Map selected date to PDS column — RP week: Fri(start)→Sat→...→Thu→Fri(end)
// vendredi = start Friday, vendredi_fin = end Friday
function dateToPdsCol(date) {
  const { start } = getRpWeekBounds(date)
  const diffDays = Math.round((date - start) / 86400000)
  // diffDays: 0=Fri(start), 1=Sat, 2=Sun, 3=Mon, 4=Tue, 5=Wed, 6=Thu, 7=Fri(end)
  const cols = ['vendredi', 'samedi', 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi_fin']
  return cols[Math.max(0, Math.min(7, diffDays))] || 'vendredi'
}
const JOURS_LABELS = { dimanche: 'Dimanche', lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi', vendredi_fin: 'Vendredi', samedi: 'Samedi' }

// ── Pie Chart (reused from MedicalStats) ──
function PieChart({ data, size = 220, title, showHours }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aucune donnée</p>
  const COLORS = ['#4B5320', '#8B4513', '#2E5090', '#C19A6B', '#708090', '#556B2F', '#8B0000', '#DAA520', '#4682B4', '#6B8E23', '#CD853F', '#A0522D', '#2F4F4F', '#B8860B']
  let angle = 0
  const slices = data.map((d, i) => {
    const pct = d.value / total
    const sa = angle; angle += pct * 360; const ea = angle
    const r = size / 2 - 10, cx = size / 2, cy = size / 2
    const x1 = cx + r * Math.cos((sa - 90) * Math.PI / 180), y1 = cy + r * Math.sin((sa - 90) * Math.PI / 180)
    const x2 = cx + r * Math.cos((ea - 90) * Math.PI / 180), y2 = cy + r * Math.sin((ea - 90) * Math.PI / 180)
    const ma = (sa + ea) / 2
    const lx = cx + (r * 0.65) * Math.cos((ma - 90) * Math.PI / 180), ly = cy + (r * 0.65) * Math.sin((ma - 90) * Math.PI / 180)
    let dv = String(d.value)
    if (showHours) { const h = Math.floor(d.value / 60), m = d.value % 60; dv = `${h}:${String(m).padStart(2, '0')}` }
    return { ...d, pct, x1, y1, x2, y2, lx, ly, r, cx, cy, color: COLORS[i % COLORS.length], dv, largeArc: pct > 0.5 ? 1 : 0 }
  })
  return (
    <div style={{ textAlign: 'center' }}>
      {title && <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>{title}</h4>}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => s.pct >= 0.999
          ? <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.color} />
          : <path key={i} d={`M${s.cx},${s.cy} L${s.x1},${s.y1} A${s.r},${s.r} 0 ${s.largeArc},1 ${s.x2},${s.y2} Z`} fill={s.color} stroke="#f5f0e1" strokeWidth="1.5" />
        )}
        {slices.filter(s => s.pct >= 0.06).map((s, i) => (
          <text key={i} x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="10" fontWeight="700" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>{s.dv}</text>
        ))}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 14px', marginTop: 8 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem' }}>
            <span style={{ width: 11, height: 11, borderRadius: 2, background: s.color, display: 'inline-block', flexShrink: 0 }} />
            <span><strong>{s.label}</strong> — {showHours ? s.dv : s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Period navigation ──
function getRpWeekBounds(date) {
  const d = new Date(date)
  const day = d.getDay(), hour = d.getHours()
  let start = new Date(d)
  if (day === 5 && hour >= 20) start.setHours(20, 0, 0, 0)
  else { const db = day === 5 ? 7 : (day >= 5 ? day - 5 : day + 2); start.setDate(d.getDate() - db); start.setHours(20, 0, 0, 0) }
  const end = new Date(start); end.setDate(end.getDate() + 7)
  return { start, end }
}

function PeriodNav({ periode, setPeriode, currentDate, setCurrentDate }) {
  const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  const fmtS = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  const getLabel = () => {
    if (periode === 'jour') return fmtS(currentDate) + `/${currentDate.getFullYear()}`
    if (periode === 'mois') return `${MOIS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    const { start, end } = getRpWeekBounds(currentDate)
    return `${fmtS(start)} — ${fmtS(end)}`
  }
  const nav = (dir) => { const d = new Date(currentDate); if (periode === 'jour') d.setDate(d.getDate() + dir); else if (periode === 'mois') d.setMonth(d.getMonth() + dir); else d.setDate(d.getDate() + dir * 7); setCurrentDate(d) }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
        {[{ key: 'jour', label: '📅 Jour' }, { key: 'semaine', label: '📆 Semaine' }, { key: 'mois', label: '🗓️ Mois' }].map(p => (
          <button key={p.key} className={`btn ${periode === p.key ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.7rem', padding: '3px 8px' }} onClick={() => { setPeriode(p.key); setCurrentDate(new Date()) }}>{p.label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
        <button className="btn btn-secondary" style={{ padding: '3px 8px' }} onClick={() => nav(-1)}>◀</button>
        <span style={{ fontWeight: 600, fontSize: '0.85rem', minWidth: 140, textAlign: 'center' }}>{getLabel()}</span>
        <button className="btn btn-secondary" style={{ padding: '3px 8px' }} onClick={() => nav(1)}>▶</button>
        <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.7rem' }} onClick={() => setCurrentDate(new Date())}>Auj.</button>
      </div>
    </div>
  )
}

function isInPeriod(dateStr, periode, currentDate) {
  if (!dateStr) return false
  const d = new Date(dateStr), c = currentDate
  if (periode === 'jour') return d.toDateString() === c.toDateString()
  if (periode === 'mois') return d.getMonth() === c.getMonth() && d.getFullYear() === c.getFullYear()
  const { start, end } = getRpWeekBounds(c)
  return d >= start && d < end
}

function weekLabel(w) {
  try {
    const [y, wn] = w.split('-W').map(Number)
    const jan4 = new Date(Date.UTC(y, 0, 4)); const dow = jan4.getUTCDay() || 7
    const mon = new Date(jan4); mon.setUTCDate(jan4.getUTCDate() - dow + 1 + (wn - 1) * 7)
    const fri = new Date(mon); fri.setUTCDate(mon.getUTCDate() + 4)
    const nxt = new Date(fri); nxt.setUTCDate(fri.getUTCDate() + 7)
    const fmt = d => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    return `${fmt(fri)} → ${fmt(nxt)}`
  } catch { return w }
}

// ── Main Component ──
export default function Commandement() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [notePrivate, setNotePrivate] = useState(false)
  const [msg, setMsg] = useState('')
  // État popup
  const [etat, setEtat] = useState(null)
  const [showEtat, setShowEtat] = useState(false)
  const [etatFilter, setEtatFilter] = useState('')
  const [etatUnite, setEtatUnite] = useState(() => (user?.isAdmin || user?.isEtatMajor) ? '' : (user?.unite_code || ''))
  // Pie charts
  const [periode, setPeriode] = useState('semaine')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [pdsData, setPdsData] = useState([])
  const [rapports, setRapports] = useState([])
  const [effectifs, setEffectifs] = useState([])
  const [frontEvents, setFrontEvents] = useState([])

  // Compute ISO week from a Friday date (mirrors backend getCurrentWeek)
  const fridayToIsoWeek = (fri) => {
    const d = new Date(Date.UTC(fri.getFullYear(), fri.getMonth(), fri.getDate()))
    const dayNum = d.getUTCDay() || 7
    const ref = new Date(d); ref.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(ref.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((ref - yearStart) / 86400000) + 1) / 7)
    return `${ref.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
  }

  // Compute which ISO weeks to fetch based on period
  const pdsWeeks = useMemo(() => {
    if (periode === 'mois') {
      // All RP weeks that overlap with the selected month
      const y = currentDate.getFullYear(), m = currentDate.getMonth()
      const weeks = new Set()
      // Check each Friday in/near this month
      const d = new Date(y, m, 1)
      // Go back to find first Friday before month start
      while (d.getDay() !== 5) d.setDate(d.getDate() - 1)
      // Iterate Fridays until we pass the month
      while (true) {
        const rpEnd = new Date(d); rpEnd.setDate(rpEnd.getDate() + 7)
        // RP week overlaps month if Friday < end-of-month AND rpEnd > start-of-month
        const monthStart = new Date(y, m, 1)
        const monthEnd = new Date(y, m + 1, 0, 23, 59, 59)
        if (d <= monthEnd && rpEnd >= monthStart) {
          weeks.add(fridayToIsoWeek(d))
        }
        d.setDate(d.getDate() + 7)
        if (d > monthEnd) break
      }
      return [...weeks]
    }
    // jour or semaine: single RP week
    const { start } = getRpWeekBounds(currentDate)
    const weeks = [fridayToIsoWeek(start)]
    // Friday in jour mode: also fetch next week (vendredi column)
    if (periode === 'jour' && currentDate.getDay() === 5) {
      const nextFri = new Date(start); nextFri.setDate(nextFri.getDate() + 7)
      weeks.push(fridayToIsoWeek(nextFri))
    }
    return weeks
  }, [currentDate, periode])

  const [pdsLabel, setPdsLabel] = useState('')

  useEffect(() => {
    api.get('/commandement/dashboard').then(r => setData(r.data)).catch(() => {})
    loadNotes()
    api.get('/rapports').then(r => setRapports(r.data.data || [])).catch(() => {})
    api.get('/effectifs').then(r => setEffectifs(r.data.data || r.data || [])).catch(() => {})
    api.get('/front/events').then(r => setFrontEvents(r.data.data || [])).catch(() => {})
  }, [])

  // Reload PDS when weeks change — merge multiple weeks for month view
  useEffect(() => {
    if (pdsWeeks.length <= 2 && periode !== 'mois') {
      const dayCol = dateToPdsCol(currentDate)
      const dayLabel = JOURS_LABELS[dayCol] || dayCol
      const fmtD = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
      setPdsLabel(periode === 'jour' ? `${dayLabel} ${fmtD(currentDate)}` : `Semaine ${weekLabel(pdsWeeks[0])}`)
      if (pdsWeeks.length === 2) {
        // Friday jour: fetch both weeks, merge vendredi from next week
        Promise.all(pdsWeeks.map(w => api.get('/pds', { params: { semaine: w } }).then(r => r.data.data || []).catch(() => [])))
          .then(([week1, week2]) => {
            const map = {}
            week1.forEach(p => { map[p.effectif_id] = { ...p } })
            week2.forEach(p => {
              if (!map[p.effectif_id]) map[p.effectif_id] = { ...p }
              else map[p.effectif_id].vendredi = p.vendredi
            })
            setPdsData(Object.values(map))
          })
      } else {
        api.get('/pds', { params: { semaine: pdsWeeks[0] } }).then(r => setPdsData(r.data.data || [])).catch(() => {})
      }
    } else {
      const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
      setPdsLabel(`${MOIS[currentDate.getMonth()]} ${currentDate.getFullYear()} (${pdsWeeks.length} semaines)`)
      Promise.all(pdsWeeks.map(w => api.get('/pds', { params: { semaine: w } }).then(r => r.data.data || []).catch(() => [])))
        .then(results => {
          // Merge: sum total_heures per effectif
          const map = {}
          results.flat().forEach(p => {
            if (!map[p.effectif_id]) map[p.effectif_id] = { ...p, total_heures: '0' }
            map[p.effectif_id].total_heures = String(parseFloat(map[p.effectif_id].total_heures) + parseFloat(p.total_heures || 0))
          })
          setPdsData(Object.values(map))
        })
    }
  }, [pdsWeeks, periode, currentDate])

  const loadNotes = () => api.get('/commandement/notes').then(r => setNotes(r.data.data)).catch(() => {})
  const addNote = async () => { if (!newNote.trim()) return; try { await api.post('/commandement/notes', { contenu: newNote, prive: notePrivate }); setNewNote(''); setNotePrivate(false); loadNotes() } catch { setMsg('Erreur') } }
  const removeNote = async (id) => { try { await api.delete(`/commandement/notes/${id}`); loadNotes() } catch {} }

  // Unit filter for charts: user's unit unless admin/EM
  const [chartUniteFilter, setChartUniteFilter] = useState('')
  const allUniteCodes = useMemo(() => [...new Set(effectifs.map(e => e.unite_code).filter(Boolean))].sort(), [effectifs])
  const chartUnite = chartUniteFilter || ((user?.isAdmin || user?.isEtatMajor) ? '' : (user?.unite_code || '916'))

  // Effectifs for the unit (SO+ = grade_rang >= 35, exclude generals >= 90)
  const unitEffectifs = useMemo(() =>
    effectifs.filter(e => {
      if (e.en_reserve) return false
      // Match unit
      const matchUnit = !chartUnite || e.unite_code === chartUnite
      if (!matchUnit) return false
      return true
    }), [effectifs, chartUnite, user])

  // SO+ effectifs (grade_rang >= 35, < 90)
  const soEffectifs = useMemo(() => unitEffectifs.filter(e => e.grade_rang >= 35 && e.grade_rang < 90), [unitEffectifs])

  // PDS pie: SO+ who filled + HDR who also filled
  // In "jour" mode: show hours for that specific day
  const pdsPie = useMemo(() => {
    const soIds = new Set(soEffectifs.map(e => e.id))
    const filled = pdsData.filter(p => (soIds.has(p.effectif_id) || parseFloat(p.total_heures) > 0) && unitEffectifs.some(e => e.id === p.effectif_id))

    const getHours = (p) => {
      if (periode === 'jour') {
        const dayCol = dateToPdsCol(currentDate)
        // For Fridays, combine both vendredi columns
        if (currentDate.getDay() === 5) {
          return parseCreneaux(p.vendredi) + parseCreneaux(p.vendredi_fin)
        }
        return parseCreneaux(p[dayCol])
      }
      return parseFloat(p.total_heures) || 0
    }

    return filled.map(p => {
      const eff = effectifs.find(e => e.id === p.effectif_id)
      const hours = getHours(p)
      if (hours <= 0) return null
      const mins = Math.round(hours * 60)
      return { label: eff ? `${eff.prenom} ${eff.nom}` : `#${p.effectif_id}`, value: mins }
    }).filter(Boolean).sort((a, b) => b.value - a.value)
  }, [pdsData, soEffectifs, unitEffectifs, effectifs, periode, currentDate])

  // Rapports pie by author (filtered period)
  const rapportsPie = useMemo(() => {
    const unitIds = new Set(unitEffectifs.map(e => e.id))
    const filtered = rapports.filter(r => isInPeriod(r.created_at, periode, currentDate) && unitIds.has(r.auteur_id))
    const map = {}
    filtered.forEach(r => {
      const nom = r.auteur_nom || `#${r.auteur_id}`
      map[nom] = (map[nom] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))
  }, [rapports, unitEffectifs, periode, currentDate])

  // Front events pie by type (filtered period) — only combat events
  const frontPie = useMemo(() => {
    const COMBAT_TYPES = ['prise', 'perte', 'attaque', 'defense']
    const filtered = frontEvents.filter(e => isInPeriod(e.date_irl || e.created_at, periode, currentDate) && COMBAT_TYPES.includes(e.type_event))
    const map = {}
    filtered.forEach(e => {
      let label = e.type_event === 'prise' ? '🚩 Prise VP' : e.type_event === 'perte' ? '🏳️ Perte VP'
        : e.type_event === 'attaque' ? (e.camp_vainqueur === 'allemand' ? '✅ Win ALL' : '⚠️ Win US')
        : e.type_event === 'defense' ? (e.camp_vainqueur === 'allemand' ? '⚠️ Déf. Win ALL' : '❌ Déf. Win US')
        : e.type_event
      map[label] = (map[label] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))
  }, [frontEvents, periode, currentDate])

  if (!data) return <div className="container"><p style={{ textAlign: 'center', padding: 40 }}>Chargement...</p></div>

  const pdsPercent = data.pds.total > 0 ? Math.round((data.pds.valides / data.pds.total) * 100) : 0

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton label="← Tableau de bord" />
      </div>
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>🎖️ Poste de Commandement</h1>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {[
          { icon: '👥', label: 'Effectifs actifs', value: data.parStatut.actifs, color: '#3d5a3e' },
          { icon: '🚫', label: 'Interdits de front', value: data.parStatut.interdits, color: '#8b4a47' },
          { icon: '📝', label: 'Rapports (semaine)', value: data.rapportsSemaine, color: '#2c5f7c' },
          { icon: '⏳', label: 'Rapports à valider', value: data.rapportsNonValides, color: '#8b6914' },
          { icon: '⏱️', label: 'PDS compliance', value: `${pdsPercent}%`, color: pdsPercent >= 70 ? '#3d5a3e' : '#8b4a47' },
        ].map((s, i) => (
          <div key={i} className="paper-card" style={{ textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '2rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 3 Pie Charts */}
      <div className="paper-card" id="commandement-charts" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-sm)' }}>
          <PeriodNav periode={periode} setPeriode={setPeriode} currentDate={currentDate} setCurrentDate={setCurrentDate} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {(user?.isAdmin || user?.isEtatMajor) && (
              <select value={chartUniteFilter} onChange={e => setChartUniteFilter(e.target.value)} className="input" style={{ fontSize: '0.8rem', padding: '4px 8px', minWidth: 100 }}>
                <option value="">Toutes les unites</option>
                {allUniteCodes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <button className="btn btn-secondary btn-small" onClick={() => exportToImage('commandement-charts', 'Camemberts')}>🖼️ Image</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-lg)', marginTop: 'var(--space-lg)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <PieChart data={pdsPie} size={220} title={`📋 PDS (SO+)`} showHours />
            <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>{pdsLabel}</p>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <PieChart data={rapportsPie} size={220} title="📝 Rapports" />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <PieChart data={frontPie} size={220} title="⚔️ Situation du Front" />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
        {/* Recent activity */}
        <div className="paper-card">
          <h3 style={{ marginTop: 0 }}>📋 Activité récente</h3>
          {data.activiteRecente?.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucune activité</p> : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {data.activiteRecente.map((a, i) => (
                <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', cursor: 'pointer' }}
                  onClick={() => navigate(a.type === 'rapport' ? `/rapports/${a.item_id}` : '/telegrammes')}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(107,143,60,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <span style={{ marginRight: 8 }}>{a.type === 'rapport' ? '📝' : '⚡'}</span>
                  <strong>{a.label}</strong>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.auteur} — {new Date(a.created_at).toLocaleString('fr-FR')}</div>
                </div>
              ))}
            </div>
          )}
          {data.rapportsNonValides > 0 && <div style={{ marginTop: 12 }}><Link to="/rapports" className="btn btn-sm btn-primary">📝 {data.rapportsNonValides} rapport(s) à valider</Link></div>}
        </div>

        {/* Notes */}
        <div className="paper-card">
          <h3 style={{ marginTop: 0 }}>📌 Notes de commandement</h3>
          <div style={{ marginBottom: 12 }}>
            <textarea className="form-input" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Écrire une note..." rows={2} style={{ resize: 'vertical', width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <label style={{ fontSize: '0.78rem', display: 'flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={notePrivate} onChange={e => setNotePrivate(e.target.checked)} /> Privée
              </label>
              <button className="btn btn-sm btn-primary" onClick={addNote}>📌 Ajouter</button>
            </div>
          </div>
          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
            {notes.map(n => (
              <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem', position: 'relative' }}>
                {n.prive ? <span style={{ fontSize: '0.65rem', color: 'var(--warning)' }}>🔒 </span> : null}
                <span>{n.contenu}</span>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{n.auteur_nom} — {new Date(n.created_at).toLocaleString('fr-FR')}</div>
                {(user?.isAdmin || n.auteur_id === user?.id) && <button onClick={() => removeNote(n.id)} style={{ position: 'absolute', top: 8, right: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="paper-card" style={{ marginTop: 'var(--space-lg)' }}>
        <h3 style={{ marginTop: 0 }}>⚡ Accès rapide</h3>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={async () => {
            try { const r = await api.get('/commandement/etat'); setEtat(r.data); setShowEtat(true); setEtatFilter('') } catch { setMsg('Erreur chargement état') }
          }}>📊 État PDS & Rapports</button>
          <Link to="/ordres" className="btn btn-secondary btn-sm">📜 Ordres</Link>
          <Link to="/calendrier" className="btn btn-secondary btn-sm">📅 Calendrier</Link>
          <Link to="/rapports" className="btn btn-secondary btn-sm">📝 Rapports</Link>
          <Link to="/interdits" className="btn btn-secondary btn-sm">🚫 Interdits</Link>
          <Link to="/pds" className="btn btn-secondary btn-sm">⏱️ PDS</Link>
          <Link to="/front" className="btn btn-secondary btn-sm">⚔️ Situation du front</Link>
          <Link to="/admin/stats" className="btn btn-secondary btn-sm">📊 Statistiques</Link>
        </div>
      </div>

      {/* État PDS & Rapports popup */}
      {showEtat && etat && (() => {
        let rows = etat.data || []
        // Unit filter
        if (etatUnite) rows = rows.filter(r => r.unite_code === etatUnite)
        // Exclude HDR (grade_rang < 35) UNLESS they filled PDS
        rows = rows.filter(r => (r.grade_rang >= 35 && r.grade_rang < 90) || r.pds_fait > 0)

        // Apply status filter
        if (etatFilter === 'pds_ok') rows = rows.filter(r => r.pds_fait && (r.pds_heures || 0) >= 6)
        else if (etatFilter === 'pds_warn') rows = rows.filter(r => r.pds_fait && (r.pds_heures || 0) < 6)
        else if (etatFilter === 'pds_none') rows = rows.filter(r => !r.pds_fait && r.grade_rang >= 35)

        const countOk = rows.filter(r => r.pds_fait && (r.pds_heures || 0) >= 6).length
        const countWarn = rows.filter(r => r.pds_fait && (r.pds_heures || 0) < 6).length
        const countNone = rows.filter(r => !r.pds_fait && r.grade_rang >= 35).length
        const totalRapports = rows.filter(r => r.rapports_semaine).length

        return (
          <div className="popup-overlay" onClick={() => setShowEtat(false)}>
            <div className="popup-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, maxHeight: '85vh', overflow: 'auto' }}>
              <button className="popup-close" onClick={() => setShowEtat(false)}>✕</button>
              <h2 style={{ marginTop: 0, textAlign: 'center' }}>📊 État de la semaine</h2>

              {/* Week selector */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
                <select className="form-input" style={{ maxWidth: 180, fontSize: '0.8rem' }} value={etat.semaine} onChange={async (e) => {
                  try { const r = await api.get('/commandement/etat', { params: { semaine: e.target.value } }); setEtat(r.data) } catch {}
                }}>
                  {(etat.weeks || []).map(w => <option key={w} value={w}>{weekLabel(w)}</option>)}
                </select>
                <select className="form-input" style={{ maxWidth: 160, fontSize: '0.8rem' }} value={etatUnite} onChange={e => setEtatUnite(e.target.value)}>
                  <option value="">Toutes unités</option>
                  {[...new Set((etat.data || []).map(r => r.unite_code).filter(Boolean))].sort().map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Stats summary */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setEtatFilter(etatFilter === 'pds_ok' ? '' : 'pds_ok')}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{countOk}</div>
                  <div style={{ fontSize: '0.75rem' }}>✅ ≥ 6h</div>
                </div>
                <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setEtatFilter(etatFilter === 'pds_warn' ? '' : 'pds_warn')}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{countWarn}</div>
                  <div style={{ fontSize: '0.75rem' }}>⚠️ &lt; 6h</div>
                </div>
                <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setEtatFilter(etatFilter === 'pds_none' ? '' : 'pds_none')}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{countNone}</div>
                  <div style={{ fontSize: '0.75rem' }}>❌ Non rempli</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalRapports}/{rows.length}</div>
                  <div style={{ fontSize: '0.75rem' }}>📝 Rapports</div>
                </div>
              </div>

              {/* Filter buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
                <button className={`btn btn-sm ${!etatFilter ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setEtatFilter('')}>Tous ({rows.length})</button>
                <button className={`btn btn-sm ${etatFilter === 'pds_ok' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setEtatFilter(etatFilter === 'pds_ok' ? '' : 'pds_ok')}>✅ OK ({countOk})</button>
                <button className={`btn btn-sm ${etatFilter === 'pds_warn' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setEtatFilter(etatFilter === 'pds_warn' ? '' : 'pds_warn')}>⚠️ Insuffisant ({countWarn})</button>
                <button className={`btn btn-sm ${etatFilter === 'pds_none' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setEtatFilter(etatFilter === 'pds_none' ? '' : 'pds_none')}>❌ Non rempli ({countNone})</button>
              </div>

              <table className="table" style={{ fontSize: '0.8rem' }}>
                <thead><tr><th>Unité</th><th>Grade</th><th>Nom</th><th style={{ textAlign: 'center' }}>PDS</th><th style={{ textAlign: 'center' }}>Heures</th><th style={{ textAlign: 'center' }}>Rapport</th></tr></thead>
                <tbody>
                  {rows.map(r => {
                    const hrs = r.pds_heures || 0
                    const icon = r.pds_fait && hrs >= 6 ? '✅' : r.pds_fait ? '⚠️' : '❌'
                    return (
                      <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dossiers/effectif/${r.id}`)}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(107,143,60,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td>{r.unite_code || '—'}</td>
                        <td style={{ fontSize: '0.75rem' }}>{r.grade_nom || '—'}</td>
                        <td><strong>{r.prenom} {r.nom}</strong></td>
                        <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>{icon}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: hrs >= 6 ? 'var(--success)' : hrs > 0 ? 'var(--warning)' : 'var(--danger)' }}>{hrs ? `${hrs}h` : '—'}</td>
                        <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>{r.rapports_semaine ? `✅ (${r.rapports_semaine})` : '❌'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
