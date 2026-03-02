import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import { exportToPdf } from '../../utils/exportPdf'

// SVG Pie Chart component
function PieChart({ data, size = 220, title }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aucune donnée</p>
  const COLORS = ['#4B5320', '#8B4513', '#2E5090', '#C19A6B', '#708090', '#556B2F', '#8B0000', '#DAA520', '#4682B4', '#6B8E23', '#CD853F', '#A0522D']
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
    return { ...d, pct, startAngle, endAngle, largeArc, x1, y1, x2, y2, lx, ly, r, cx, cy, color: COLORS[i % COLORS.length] }
  })

  return (
    <div style={{ textAlign: 'center' }}>
      {title && <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>{title}</h4>}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => {
          if (s.pct >= 0.999) return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.color} />
          return <path key={i} d={`M${s.cx},${s.cy} L${s.x1},${s.y1} A${s.r},${s.r} 0 ${s.largeArc},1 ${s.x2},${s.y2} Z`} fill={s.color} stroke="#f5f0e1" strokeWidth="1" />
        })}
        {slices.filter(s => s.pct >= 0.05).map((s, i) => (
          <text key={i} x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="9" fontWeight="700" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
            {(s.pct * 100).toFixed(0)}%
          </text>
        ))}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 14px', marginTop: 8 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: 'inline-block', flexShrink: 0 }} />
            <span>{s.label} ({s.value})</span>
          </div>
        ))}
      </div>
    </div>
  )
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
      // Fetch Sanitat effectifs
      api.get('/effectifs').then(r => {
        const all = r.data.data || r.data || []
        setSanitatEffectifs(all.filter(e => e.unite_code === '916S'))
      }).catch(() => {}),
      // Fetch PDS data for current week
      api.get('/pds').then(r => setPdsData(r.data.data || [])).catch(() => {}),
    ])
  }, [])

  const fmt = (d) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('fr-FR') + ' ' + new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) } catch { return d }
  }
  const fmtDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d } }
  const now = new Date()
  const nowStr = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  // RP week key (Fri 20h → Fri 20h)
  const getRpWeekKey = (dateStr) => {
    const d = new Date(dateStr)
    const day = d.getDay(), hour = d.getHours()
    let fridayStart = new Date(d)
    if (day === 5 && hour >= 20) {
      fridayStart.setHours(20, 0, 0, 0)
    } else {
      const daysBack = day === 5 ? 7 : (day >= 5 ? day - 5 : day + 2)
      fridayStart.setDate(d.getDate() - daysBack)
      fridayStart.setHours(20, 0, 0, 0)
    }
    const fridayEnd = new Date(fridayStart); fridayEnd.setDate(fridayEnd.getDate() + 7)
    return `${fridayStart.toLocaleDateString('fr-FR')} → ${fridayEnd.toLocaleDateString('fr-FR')}`
  }
  const getKey = (dateStr) => {
    if (!dateStr) return 'Inconnu'
    const d = new Date(dateStr)
    if (periode === 'jour') return d.toLocaleDateString('fr-FR')
    if (periode === 'mois') { const m = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']; return `${m[d.getMonth()]} ${d.getFullYear()}` }
    return getRpWeekKey(dateStr)
  }

  // Only Sanitat medecins soins
  const sanitatIds = useMemo(() => new Set(sanitatEffectifs.map(e => e.id)), [sanitatEffectifs])
  const sanitatSoins = useMemo(() => soins.filter(s => sanitatIds.has(s.medecin_id)), [soins, sanitatIds])

  // PDS data for Sanitat effectifs (pie chart)
  const pdsSanitat = useMemo(() => {
    const sanitatIdSet = new Set(sanitatEffectifs.map(e => e.id))
    return pdsData.filter(p => sanitatIdSet.has(p.effectif_id))
  }, [pdsData, sanitatEffectifs])

  const pdsPieData = useMemo(() => {
    return pdsSanitat.filter(p => p.heures_totales > 0).map(p => {
      const eff = sanitatEffectifs.find(e => e.id === p.effectif_id)
      const h = Math.floor((p.heures_totales || 0) / 60)
      const m = (p.heures_totales || 0) % 60
      return {
        label: eff ? `${eff.prenom} ${eff.nom}` : `Effectif #${p.effectif_id}`,
        value: p.heures_totales || 0,
        display: `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`
      }
    }).sort((a, b) => b.value - a.value)
  }, [pdsSanitat, sanitatEffectifs])

  // Soins breakdown by type
  const soinsBreakdownAll = useMemo(() => {
    const map = {}
    sanitatSoins.forEach(s => {
      const t = s.type_soin || 'Non précisé'
      map[t] = (map[t] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))
  }, [sanitatSoins])

  // Soins by period
  const soinsBreakdownFiltered = useMemo(() => {
    const currentKey = getKey(new Date().toISOString())
    const filtered = sanitatSoins.filter(s => getKey(s.date_soin) === currentKey)
    const map = {}
    filtered.forEach(s => {
      const t = s.type_soin || 'Non précisé'
      map[t] = (map[t] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))
  }, [sanitatSoins, periode])

  // Medecin stats (Sanitat only)
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
    // Add visite counts
    visites.forEach(v => {
      const creatorId = v.created_by
      // Match by medecin name with sanitatEffectifs
      const eff = sanitatEffectifs.find(e => v.medecin?.includes(e.nom) || v.created_by_nom?.includes(e.nom))
      if (!eff) return
      if (!map[eff.id]) map[eff.id] = { id: eff.id, nom: `${eff.prenom} ${eff.nom}`, soins: 0, patients: new Set(), entries: [], types: {} }
      map[eff.id].types['Visite médicale'] = (map[eff.id].types['Visite médicale'] || 0) + 1
    })
    return Object.values(map).sort((a, b) => b.soins - a.soins)
  }, [sanitatSoins, visites, sanitatEffectifs])

  // Patient list from soins
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

  // Totals for Sanitat
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

  // Medecin detail popup
  const renderMedecinPopup = () => {
    if (!selectedMedecin) return null
    const med = selectedMedecin
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '30px 10px', overflowY: 'auto' }}
        onClick={ev => { if (ev.target === ev.currentTarget) setSelectedMedecin(null) }}>
        <div id="medecin-report" style={{ maxWidth: 900, width: '100%', background: '#f5f0e1', borderRadius: 8, padding: 'var(--space-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid var(--military-green)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>Sanitätsdienst — 916. Sanitats-Abteilung</div>
            <h2 style={{ margin: 'var(--space-sm) 0', fontSize: '1.4rem' }}>📋 Rapport d'activité médicale</h2>
            <h3 style={{ margin: 0, color: 'var(--military-green)', fontSize: '1.2rem' }}>{med.nom}</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>Généré le {nowStr}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
            <button className="btn btn-primary" disabled={exporting} onClick={() => handleExportPdf('medecin-report', `rapport-${med.nom.replace(/\s/g, '_')}`)}>
              {exporting ? '⏳' : '📄 PDF'}
            </button>
            <button className="btn btn-secondary" onClick={() => setSelectedMedecin(null)}>✕</button>
          </div>
          {/* Stats */}
          <div className="paper-card" style={{ marginBottom: 'var(--space-lg)', background: 'rgba(75,83,32,0.05)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--military-green)' }}>{med.soins}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Soins au front</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--military-green)' }}>{med.patients.size}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Patients traités</div></div>
            </div>
          </div>
          {/* Type breakdown pie */}
          {Object.keys(med.types).length > 0 && (
            <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
              <PieChart data={Object.entries(med.types).map(([label, value]) => ({ label, value }))} title="Répartition des actes" size={200} />
            </div>
          )}
          {/* Entries table */}
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
            Archives 7e Armeekorps — Sanitätsdienst — Rapport généré automatiquement
          </div>
        </div>
      </div>
    )
  }

  // Patient detail popup
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
          <div style={{ display: 'flex', gap: 'var(--space-lg)', justifyContent: 'center', marginBottom: 'var(--space-lg)' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--military-green)' }}>{p.count}</div><div style={{ fontSize: '0.7rem' }}>Soins reçus</div></div>
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
        {/* Totaux globaux */}
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0, textAlign: 'center' }}>Vue d'ensemble Sanitätsdienst</h3>
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
        </div>

        {/* Two pie charts side by side */}
        <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
          {/* PDS Sanitat pie */}
          <div className="paper-card" style={{ flex: 1, minWidth: 280 }}>
            <h3 style={{ marginTop: 0, textAlign: 'center', fontSize: '0.95rem' }}>📋 PDS — 916. Sanitats-Abteilung</h3>
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>Heures de présence cette semaine</p>
            {pdsPieData.length > 0 ? (
              <PieChart
                data={pdsPieData.map(d => ({ label: `${d.label} (${d.display})`, value: d.value }))}
                size={240}
              />
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aucune donnée PDS cette semaine</p>
            )}
          </div>

          {/* Soins type pie */}
          <div className="paper-card" style={{ flex: 1, minWidth: 280 }}>
            <h3 style={{ marginTop: 0, textAlign: 'center', fontSize: '0.95rem' }}>⚕️ Types de soins effectués</h3>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', marginBottom: 12 }}>
              {[{ key: 'jour', label: 'Jour' }, { key: 'semaine', label: 'Semaine' }, { key: 'mois', label: 'Mois' }].map(p => (
                <button key={p.key} className={`btn ${periode === p.key ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.7rem', padding: '3px 10px' }}
                  onClick={() => setPeriode(p.key)}>
                  {p.label}
                </button>
              ))}
            </div>
            {soinsBreakdownFiltered.length > 0 ? (
              <PieChart data={soinsBreakdownFiltered} size={240} />
            ) : (
              <>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0 0 8px' }}>Aucun soin cette période — Affichage total :</p>
                <PieChart data={soinsBreakdownAll} size={240} />
              </>
            )}
          </div>
        </div>

        {/* Médecins Sanitat — clickable */}
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

        {/* Patients traités — clickable */}
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

        {/* Effectifs Sanitat list */}
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
            {exporting ? '⏳ Export en cours...' : '📄 Exporter en PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
