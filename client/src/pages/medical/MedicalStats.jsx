import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import { exportToPdf } from '../../utils/exportPdf'

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
function dateToPdsCol(date) {
  const { start } = getRpWeekBounds(date)
  const diffDays = Math.round((date - start) / 86400000)
  const cols = ['vendredi', 'samedi', 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi_fin']
  return cols[Math.max(0, Math.min(7, diffDays))] || 'vendredi'
}
const JOURS_LABELS = { dimanche: 'Dimanche', lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi', vendredi_fin: 'Vendredi', samedi: 'Samedi' }

// SVG Pie Chart — labels show name + value (not %)
function PieChart({ data, size = 240, title, showHours }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aucune donnée</p>
  const COLORS = ['#4B5320', '#8B4513', '#2E5090', '#C19A6B', '#708090', '#556B2F', '#8B0000', '#DAA520', '#4682B4', '#6B8E23', '#CD853F', '#A0522D', '#2F4F4F', '#B8860B']
  let angle = 0
  const slices = data.map((d, i) => {
    const pct = d.value / total
    const startAngle = angle
    angle += pct * 360
    const endAngle = angle
    const largeArc = pct > 0.5 ? 1 : 0
    const r = size / 2 - 10
    const cx = size / 2, cy = size / 2
    const x1 = cx + r * Math.cos((startAngle - 90) * Math.PI / 180)
    const y1 = cy + r * Math.sin((startAngle - 90) * Math.PI / 180)
    const x2 = cx + r * Math.cos((endAngle - 90) * Math.PI / 180)
    const y2 = cy + r * Math.sin((endAngle - 90) * Math.PI / 180)
    const midAngle = (startAngle + endAngle) / 2
    const lx = cx + (r * 0.65) * Math.cos((midAngle - 90) * Math.PI / 180)
    const ly = cy + (r * 0.65) * Math.sin((midAngle - 90) * Math.PI / 180)
    // Format display value
    let displayVal = String(d.value)
    if (showHours) {
      const h = Math.floor(d.value / 60)
      const m = d.value % 60
      displayVal = `${h}:${String(m).padStart(2, '0')}`
    }
    return { ...d, pct, startAngle, endAngle, largeArc, x1, y1, x2, y2, lx, ly, r, cx, cy, color: COLORS[i % COLORS.length], displayVal }
  })

  return (
    <div style={{ textAlign: 'center' }}>
      {title && <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>{title}</h4>}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => {
          if (s.pct >= 0.999) return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.color} />
          return <path key={i} d={`M${s.cx},${s.cy} L${s.x1},${s.y1} A${s.r},${s.r} 0 ${s.largeArc},1 ${s.x2},${s.y2} Z`} fill={s.color} stroke="#f5f0e1" strokeWidth="1.5" />
        })}
        {slices.filter(s => s.pct >= 0.06).map((s, i) => (
          <text key={i} x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="10" fontWeight="700" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
            {s.displayVal}
          </text>
        ))}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 16px', marginTop: 10 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: s.color, display: 'inline-block', flexShrink: 0 }} />
            <span><strong>{s.label}</strong> — {showHours ? s.displayVal : s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Period navigation with readable labels
function PeriodNav({ periode, setPeriode, currentDate, setCurrentDate }) {
  const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

  const fmtShort = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

  const getLabel = () => {
    const d = currentDate
    if (periode === 'jour') return fmtShort(d) + `/${d.getFullYear()}`
    if (periode === 'mois') return `${MOIS[d.getMonth()]} ${d.getFullYear()}`
    // Semaine RP (Fri 20h → Fri 20h)
    const { start, end } = getRpWeekBounds(d)
    return `${fmtShort(start)} — ${fmtShort(end)}`
  }

  const navigate = (dir) => {
    const d = new Date(currentDate)
    if (periode === 'jour') d.setDate(d.getDate() + dir)
    else if (periode === 'mois') d.setMonth(d.getMonth() + dir)
    else d.setDate(d.getDate() + dir * 7)
    setCurrentDate(d)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        {[{ key: 'jour', label: '📅 Jour' }, { key: 'semaine', label: '📆 Semaine' }, { key: 'mois', label: '🗓️ Mois' }].map(p => (
          <button key={p.key} className={`btn ${periode === p.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '4px 12px' }}
            onClick={() => { setPeriode(p.key); setCurrentDate(new Date()) }}>
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.85rem' }} onClick={() => navigate(-1)}>◀</button>
        <span style={{ fontWeight: 600, fontSize: '0.9rem', minWidth: 160, textAlign: 'center' }}>{getLabel()}</span>
        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.85rem' }} onClick={() => navigate(1)}>▶</button>
        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setCurrentDate(new Date())}>Aujourd'hui</button>
      </div>
    </div>
  )
}

function getRpWeekBounds(date) {
  const d = new Date(date)
  const day = d.getDay(), hour = d.getHours()
  let start = new Date(d)
  if (day === 5 && hour >= 20) {
    start.setHours(20, 0, 0, 0)
  } else {
    const daysBack = day === 5 ? 7 : (day >= 5 ? day - 5 : day + 2)
    start.setDate(d.getDate() - daysBack)
    start.setHours(20, 0, 0, 0)
  }
  const end = new Date(start); end.setDate(end.getDate() + 7)
  return { start, end }
}

function isInPeriod(dateStr, periode, currentDate) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const c = currentDate
  if (periode === 'jour') {
    return d.toDateString() === c.toDateString()
  }
  if (periode === 'mois') {
    return d.getMonth() === c.getMonth() && d.getFullYear() === c.getFullYear()
  }
  // semaine RP
  const { start, end } = getRpWeekBounds(c)
  return d >= start && d < end
}

export default function MedicalStats() {
  const { user } = useAuth()
  const [soins, setSoins] = useState([])
  const [visites, setVisites] = useState([])
  const [hospitalisations, setHospitalisations] = useState([])
  const [vaccinations, setVaccinations] = useState([])
  const [blessures, setBlessures] = useState([])
  const [pdsData, setPdsData] = useState([])
  const [sanitatEffectifs, setSanitatEffectifs] = useState([])
  const [periode, setPeriode] = useState('semaine')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedMedecin, setSelectedMedecin] = useState(null)
  const [selectedEffectif, setSelectedEffectif] = useState(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/medical-soldbuch/soins').then(r => setSoins(r.data.data || [])).catch(() => {}),
      api.get('/medical/visites').then(r => setVisites(r.data.data || [])).catch(() => {}),
      api.get('/medical-soldbuch/hospitalisations').then(r => setHospitalisations(r.data.data || [])).catch(() => {}),
      api.get('/medical-soldbuch/vaccinations').then(r => setVaccinations(r.data.data || [])).catch(() => {}),
      api.get('/medical-soldbuch/blessures').then(r => setBlessures(r.data.data || [])).catch(() => {}),
      api.get('/effectifs').then(r => {
        const all = r.data.data || r.data || []
        setSanitatEffectifs(all.filter(e => e.unite_code === 'FSA'))
      }).catch(() => {}),
    ])
  }, [])

  // Compute ISO week from a Friday date
  const fridayToIsoWeek = (fri) => {
    const d = new Date(Date.UTC(fri.getFullYear(), fri.getMonth(), fri.getDate()))
    const dayNum = d.getUTCDay() || 7
    const ref = new Date(d); ref.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(ref.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((ref - yearStart) / 86400000) + 1) / 7)
    return `${ref.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
  }

  const pdsWeeks = useMemo(() => {
    if (periode === 'mois') {
      const y = currentDate.getFullYear(), m = currentDate.getMonth()
      const weeks = new Set()
      const d = new Date(y, m, 1)
      while (d.getDay() !== 5) d.setDate(d.getDate() - 1)
      while (true) {
        const rpEnd = new Date(d); rpEnd.setDate(rpEnd.getDate() + 7)
        const monthEnd = new Date(y, m + 1, 0, 23, 59, 59)
        if (d <= monthEnd && rpEnd >= new Date(y, m, 1)) weeks.add(fridayToIsoWeek(d))
        d.setDate(d.getDate() + 7)
        if (d > monthEnd) break
      }
      return [...weeks]
    }
    const { start } = getRpWeekBounds(currentDate)
    const weeks = [fridayToIsoWeek(start)]
    // Friday in jour mode: also fetch next week (vendredi column = start of next RP week)
    if (periode === 'jour' && currentDate.getDay() === 5) {
      const nextFri = new Date(start); nextFri.setDate(nextFri.getDate() + 7)
      weeks.push(fridayToIsoWeek(nextFri))
    }
    return weeks
  }, [currentDate, periode])

  const [pdsLabel, setPdsLabel] = useState('')

  useEffect(() => {
    const wkLabel = (w) => { try { const [y,wn]=w.split('-W').map(Number); const j4=new Date(Date.UTC(y,0,4)); const dw=j4.getUTCDay()||7; const m=new Date(j4); m.setUTCDate(j4.getUTCDate()-dw+1+(wn-1)*7); const f=new Date(m); f.setUTCDate(m.getUTCDate()+4); const n=new Date(f); n.setUTCDate(f.getUTCDate()+7); const fmt=d=>`${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}`; return `${fmt(f)} → ${fmt(n)}` } catch { return w } }
    if (pdsWeeks.length <= 2 && periode !== 'mois') {
      const dayCol = dateToPdsCol(currentDate)
      const fmtD = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
      setPdsLabel(periode === 'jour' ? `${JOURS_LABELS[dayCol]} ${fmtD(currentDate)}` : `Semaine ${wkLabel(pdsWeeks[0])}`)
      // For Friday jour mode, fetch both weeks and merge vendredi columns per effectif
      if (pdsWeeks.length === 2) {
        Promise.all(pdsWeeks.map(w => api.get('/pds', { params: { semaine: w } }).then(r => r.data.data || []).catch(() => [])))
          .then(([week1, week2]) => {
            // week1 = current RP week (has vendredi_fin), week2 = next RP week (has vendredi)
            const map = {}
            week1.forEach(p => { map[p.effectif_id] = { ...p } })
            week2.forEach(p => {
              if (!map[p.effectif_id]) map[p.effectif_id] = { ...p }
              else map[p.effectif_id].vendredi = p.vendredi // copy vendredi from next week
            })
            setPdsData(Object.values(map))
          })
      } else {
        api.get('/pds', { params: { semaine: pdsWeeks[0] } }).then(r => setPdsData(r.data.data || [])).catch(() => {})
      }
    } else {
      const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
      setPdsLabel(`${MOIS[currentDate.getMonth()]} ${currentDate.getFullYear()} (${pdsWeeks.length} sem.)`)
      Promise.all(pdsWeeks.map(w => api.get('/pds', { params: { semaine: w } }).then(r => r.data.data || []).catch(() => [])))
        .then(results => {
          const map = {}
          results.flat().forEach(p => {
            if (!map[p.effectif_id]) map[p.effectif_id] = { ...p, total_heures: '0' }
            map[p.effectif_id].total_heures = String(parseFloat(map[p.effectif_id].total_heures) + parseFloat(p.total_heures || 0))
          })
          setPdsData(Object.values(map))
        })
    }
  }, [pdsWeeks, periode, currentDate])

  const fmt = (d) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('fr-FR') + ' ' + new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) } catch { return d }
  }
  const fmtDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d } }
  const now = new Date()
  const nowStr = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  // Sanitat effectif IDs (for PDS + medecin stats)
  const sanitatIds = useMemo(() => new Set(sanitatEffectifs.map(e => e.id)), [sanitatEffectifs])
  // ALL soins (global stats, not filtered by unit)
  const sanitatSoins = soins
  // Soins filtered by current period
  const filteredSoins = useMemo(() => sanitatSoins.filter(s => isInPeriod(s.date_soin, periode, currentDate)), [sanitatSoins, periode, currentDate])

  // Soins breakdown by type (ALL time, for vue d'ensemble)
  const soinsTypeCountsAll = useMemo(() => {
    const map = {}
    sanitatSoins.forEach(s => {
      const t = s.type_soin || 'Non précisé'
      map[t] = (map[t] || 0) + 1
    })
    return map
  }, [sanitatSoins])

  // Soins breakdown by type (filtered period, for pie chart)
  const soinsTypePie = useMemo(() => {
    const map = {}
    filteredSoins.forEach(s => {
      const t = s.type_soin || 'Non précisé'
      map[t] = (map[t] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))
  }, [filteredSoins])

  // PDS pie data for Sanitat effectifs — show hours not %
  const pdsPieData = useMemo(() => {
    const sanitatIdSet = new Set(sanitatEffectifs.map(e => e.id))
    const sanitPds = pdsData.filter(p => sanitatIdSet.has(p.effectif_id))

    const getHours = (p) => {
      if (periode === 'jour') {
        if (currentDate.getDay() === 5) {
          return parseCreneaux(p.vendredi) + parseCreneaux(p.vendredi_fin)
        }
        const dayCol = dateToPdsCol(currentDate)
        return parseCreneaux(p[dayCol])
      }
      return parseFloat(p.total_heures) || 0
    }

    return sanitPds.map(p => {
      const eff = sanitatEffectifs.find(e => e.id === p.effectif_id)
      const hours = getHours(p)
      if (hours <= 0) return null
      const mins = Math.round(hours * 60)
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return {
        label: eff ? `${eff.prenom} ${eff.nom}` : `#${p.effectif_id}`,
        value: mins,
        displayTime: `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`
      }
    }).filter(Boolean).sort((a, b) => b.value - a.value)
  }, [pdsData, sanitatEffectifs, periode, currentDate])

  // Medecin stats (ALL medecins who performed soins)
  const medecinStats = useMemo(() => {
    const map = {}
    sanitatSoins.forEach(s => {
      const nom = s.medecin_nom || 'Inconnu'
      const id = s.medecin_id
      if (!map[id]) map[id] = { id, nom, soins: 0, patients: new Set(), entries: [], types: {} }
      map[id].soins++
      map[id].entries.push(s)
      if (s.patient_nom) map[id].patients.add(s.patient_nom)
      const t = s.type_soin || 'Autre'
      map[id].types[t] = (map[id].types[t] || 0) + 1
    })
    return Object.values(map).sort((a, b) => b.soins - a.soins)
  }, [sanitatSoins])

  // Patient list (all soins)
  const patientList = useMemo(() => {
    const map = {}
    sanitatSoins.forEach(s => {
      const nom = s.patient_nom || s.patient_nom_libre || 'Inconnu'
      if (nom === 'Inconnu') return
      if (!map[nom]) map[nom] = { nom, count: 0, types: {} }
      map[nom].count++
      const t = s.type_soin || 'Autre'
      map[nom].types[t] = (map[nom].types[t] || 0) + 1
    })
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [sanitatSoins])

  // Global totals
  const totals = useMemo(() => ({
    soins: sanitatSoins.length,
    visites: visites.length,
    hosp: hospitalisations.length,
    vaccins: vaccinations.length,
    blessures: blessures.length,
    medecins: new Set(sanitatSoins.map(s => s.medecin_id)).size,
    patients: new Set(sanitatSoins.map(s => s.patient_nom || s.patient_nom_libre).filter(Boolean)).size
  }), [sanitatSoins, visites, hospitalisations, vaccinations, blessures])

  const handleExportPdf = async (id, filename) => {
    setExporting(true)
    await new Promise(r => setTimeout(r, 300))
    await exportToPdf(id, filename)
    setExporting(false)
  }

  // Medecin popup
  const renderMedecinPopup = () => {
    if (!selectedMedecin) return null
    const med = selectedMedecin
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '30px 10px', overflowY: 'auto' }}
        onClick={ev => { if (ev.target === ev.currentTarget) setSelectedMedecin(null) }}>
        <div id="medecin-report" style={{ maxWidth: 900, width: '100%', background: '#f5f0e1', borderRadius: 8, padding: 'var(--space-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid var(--military-green)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>Sanitätsdienst — 916. Sanitats-Abteilung</div>
            <h2 style={{ margin: 'var(--space-sm) 0', fontSize: '1.4rem' }}>📋 Rapport d'activité</h2>
            <h3 style={{ margin: 0, color: 'var(--military-green)' }}>{med.nom}</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>Généré le {nowStr}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
            <button className="btn btn-primary" disabled={exporting} onClick={() => handleExportPdf('medecin-report', `rapport-${med.nom.replace(/\s/g, '_')}`)}>
              {exporting ? '⏳' : '📄 PDF'}
            </button>
            <button className="btn btn-secondary" onClick={() => setSelectedMedecin(null)}>✕</button>
          </div>
          <div className="paper-card" style={{ marginBottom: 'var(--space-lg)', background: 'rgba(75,83,32,0.05)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--military-green)' }}>{med.soins}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Soins au front</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--military-green)' }}>{med.patients.size}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Patients</div></div>
            </div>
          </div>
          {Object.keys(med.types).length > 0 && (
            <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
              <PieChart data={Object.entries(med.types).map(([label, value]) => ({ label, value }))} title="Répartition des actes" size={200} />
            </div>
          )}
          <div className="paper-card">
            <h4 style={{ marginTop: 0 }}>🕐 Journal des soins</h4>
            <table className="table">
              <thead><tr><th>Date</th><th>Type</th><th>Patient</th><th>Contexte</th><th>Notes</th></tr></thead>
              <tbody>
                {med.entries.map((s, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{fmt(s.date_soin)}</td>
                    <td>{s.type_soin || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{s.patient_nom || s.patient_nom_libre || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{s.contexte || '—'}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Archives 7e Armeekorps — Sanitätsdienst
          </div>
        </div>
      </div>
    )
  }

  // Patient popup
  const renderEffectifPopup = () => {
    if (!selectedEffectif) return null
    const p = selectedEffectif
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '30px 10px', overflowY: 'auto' }}
        onClick={ev => { if (ev.target === ev.currentTarget) setSelectedEffectif(null) }}>
        <div style={{ maxWidth: 700, width: '100%', background: '#f5f0e1', borderRadius: 8, padding: 'var(--space-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid var(--military-green)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ margin: 0, color: 'var(--military-green)' }}>📋 Fiche patient — {p.nom}</h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedEffectif(null)}>✕</button>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--military-green)' }}>{p.count}</div>
            <div style={{ fontSize: '0.7rem' }}>Soins reçus</div>
          </div>
          {Object.keys(p.types).length > 0 && (
            <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
              <PieChart data={Object.entries(p.types).map(([label, value]) => ({ label, value }))} title="Types de soins reçus" size={180} />
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Archives 7e Armeekorps — Sanitätsdienst
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <BackButton label="← Service médical" to="/medical" />
      <h1 style={{ textAlign: 'center', margin: 'var(--space-lg) 0' }}>📊 Statistiques — 916. Sanitats-Abteilung</h1>

      {renderMedecinPopup()}
      {renderEffectifPopup()}

      <div id="medical-report">
        {/* Vue d'ensemble */}
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0, textAlign: 'center' }}>Vue d'ensemble</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
            {[
              { icon: '⚕️', label: 'Soins au front', val: totals.soins },
              { icon: '🏥', label: 'Visites médicales', val: totals.visites },
              { icon: '🏨', label: 'Hospitalisations', val: totals.hosp },
              { icon: '💉', label: 'Vaccinations', val: totals.vaccins },
              { icon: '🩹', label: 'Blessures', val: totals.blessures },
              { icon: '👨‍⚕️', label: 'Médecins actifs', val: totals.medecins },
              { icon: '👥', label: 'Patients traités', val: totals.patients },
            ].map((c, i) => (
              <div key={i} style={{ textAlign: 'center', minWidth: 70 }}>
                <div style={{ fontSize: '1.2rem' }}>{c.icon}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--military-green)' }}>{c.val}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Soins breakdown line under header */}
          {Object.keys(soinsTypeCountsAll).length > 0 && (
            <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>Détail des soins au front</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                {Object.entries(soinsTypeCountsAll).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} style={{ textAlign: 'center', minWidth: 60 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--military-green)' }}>{count}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', maxWidth: 80, lineHeight: 1.2 }}>{type}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Two pie charts */}
        <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
          {/* PDS Sanitat pie — hours displayed */}
          <div className="paper-card" style={{ flex: 1, minWidth: 280 }}>
            <h3 style={{ marginTop: 0, textAlign: 'center', fontSize: '0.95rem' }}>📋 PDS — 916. Sanitats-Abteilung</h3>
            <PeriodNav periode={periode} setPeriode={setPeriode} currentDate={currentDate} setCurrentDate={setCurrentDate} />
            <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', margin: '8px 0 12px' }}>{pdsLabel}</p>
            {pdsPieData.length > 0 ? (
              <PieChart
                data={pdsPieData.map(d => ({ label: d.label, value: d.value }))}
                size={250}
                showHours
              />
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aucune donnée PDS cette semaine</p>
            )}
          </div>

          {/* Soins type pie — with date navigation */}
          <div className="paper-card" style={{ flex: 1, minWidth: 280 }}>
            <h3 style={{ marginTop: 0, textAlign: 'center', fontSize: '0.95rem' }}>⚕️ Types de soins effectués</h3>
            <PeriodNav periode={periode} setPeriode={setPeriode} currentDate={currentDate} setCurrentDate={setCurrentDate} />
            <div style={{ marginTop: 16 }}>
              {soinsTypePie.length > 0 ? (
                <PieChart data={soinsTypePie} size={250} />
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '20px 0' }}>Aucun soin sur cette période</p>
              )}
            </div>
          </div>
        </div>

        {/* Médecins Sanitat */}
        {medecinStats.length > 0 && (
          <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ marginTop: 0 }}>👨‍⚕️ Médecins Sanitat — Cliquez pour le rapport</h3>
            <table className="table">
              <thead><tr><th>Médecin</th><th>Soins</th><th>Patients</th><th>Types principaux</th><th></th></tr></thead>
              <tbody>
                {medecinStats.map((m, i) => (
                  <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedMedecin(m)}>
                    <td style={{ fontWeight: 600 }}>{i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}{m.nom}</td>
                    <td style={{ fontWeight: 700 }}>{m.soins}</td>
                    <td>{m.patients.size}</td>
                    <td style={{ fontSize: '0.75rem' }}>
                      {Object.entries(m.types).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, c]) => `${t} (${c})`).join(', ')}
                    </td>
                    <td style={{ color: 'var(--military-green)', fontSize: '0.8rem' }}>📋 →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Patients */}
        {patientList.length > 0 && (
          <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ marginTop: 0 }}>👥 Patients traités — Cliquez pour la fiche</h3>
            <table className="table">
              <thead><tr><th>Patient</th><th>Soins reçus</th><th>Types principaux</th><th></th></tr></thead>
              <tbody>
                {patientList.map(p => (
                  <tr key={p.nom} style={{ cursor: 'pointer' }} onClick={() => setSelectedEffectif(p)}>
                    <td style={{ fontWeight: 600 }}>{p.nom}</td>
                    <td style={{ fontWeight: 700 }}>{p.count}</td>
                    <td style={{ fontSize: '0.75rem' }}>
                      {Object.entries(p.types).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, c]) => `${t} (${c})`).join(', ')}
                    </td>
                    <td style={{ color: 'var(--military-green)', fontSize: '0.8rem' }}>📋 →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Effectifs Sanitat */}
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>🏥 Effectifs 916. Sanitats-Abteilung</h3>
          {sanitatEffectifs.length > 0 ? (
            <table className="table">
              <thead><tr><th>Grade</th><th>Nom</th><th>Spécialité</th><th>Statut</th></tr></thead>
              <tbody>
                {sanitatEffectifs.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontSize: '0.8rem' }}>{e.grade_nom || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{e.prenom} {e.nom}</td>
                    <td style={{ fontSize: '0.8rem' }}>{e.specialite || '—'}</td>
                    <td>{e.actif ? '🟢 Actif' : '🔴 Inactif'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucun effectif Sanitat trouvé</p>
          )}
        </div>

        {/* Export */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          <button className="btn btn-primary" disabled={exporting} onClick={() => handleExportPdf('medical-report', 'statistiques-sanitat')}>
            {exporting ? '⏳ Export...' : '📄 Exporter en PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
