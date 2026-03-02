import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import { exportToPdf } from '../../utils/exportPdf'

export default function MedicalStats() {
  const { user } = useAuth()
  const [soins, setSoins] = useState([])
  const [visites, setVisites] = useState([])
  const [hospitalisations, setHospitalisations] = useState([])
  const [vaccinations, setVaccinations] = useState([])
  const [blessures, setBlessures] = useState([])
  const [periode, setPeriode] = useState('jour')
  const [expandedKey, setExpandedKey] = useState(null)
  const [selectedMedecin, setSelectedMedecin] = useState(null)
  const [selectedEffectif, setSelectedEffectif] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [filterPeriode, setFilterPeriode] = useState('') // selected period key to filter

  useEffect(() => {
    Promise.all([
      api.get('/medical-soldbuch/soins').then(r => setSoins(r.data.data || [])).catch(() => {}),
      api.get('/medical/visites').then(r => setVisites(r.data.data || [])).catch(() => {}),
      api.get('/medical-soldbuch/hospitalisations').then(r => setHospitalisations(r.data.data || [])).catch(() => {}),
      api.get('/medical-soldbuch/vaccinations').then(r => setVaccinations(r.data.data || [])).catch(() => {}),
      api.get('/medical-soldbuch/blessures').then(r => setBlessures(r.data.data || [])).catch(() => {}),
    ])
  }, [])

  const fmt = (d) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('fr-FR') + ' ' + new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) } catch { return d }
  }
  const fmtDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d } }
  const now = new Date()
  const nowStr = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const allLog = useMemo(() => {
    const log = []
    soins.forEach(s => log.push({ date: s.date_soin, type: 'Soin', icon: '⚕️', medecin: s.medecin_nom || '—', patient: s.patient_nom || s.patient_nom_libre || 'Anonyme', detail: [s.contexte, s.type_soin].filter(Boolean).join(' — '), notes: s.notes || '' }))
    visites.forEach(v => log.push({ date: v.date_visite || v.created_at, type: 'Visite', icon: '🏥', medecin: v.medecin_nom || v.created_by_nom || '—', patient: v.effectif_nom || '—', detail: v.aptitude || v.type_visite || '', notes: v.observations || '' }))
    hospitalisations.forEach(h => log.push({ date: h.date_entree || h.created_at, type: 'Hosp.', icon: '🏨', medecin: h.medecin_nom || '—', patient: h.effectif_nom || h.effectif_nom_libre || '—', detail: h.motif || '', notes: h.date_sortie ? `Sorti ${fmtDate(h.date_sortie)}` : 'En cours' }))
    vaccinations.forEach(v => log.push({ date: v.date_vaccination || v.created_at, type: 'Vaccin', icon: '💉', medecin: v.medecin_nom || '—', patient: v.effectif_nom || v.effectif_nom_libre || '—', detail: v.vaccin || v.type_vaccin || '', notes: v.notes || '' }))
    blessures.forEach(b => log.push({ date: b.date_blessure || b.created_at, type: 'Blessure', icon: '🩹', medecin: '—', patient: b.effectif_nom || b.effectif_nom_libre || '—', detail: [b.gravite, b.type_blessure].filter(Boolean).join(' — '), notes: b.description || '' }))
    log.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    return log
  }, [soins, visites, hospitalisations, vaccinations, blessures])

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
    return `${fridayStart.toLocaleDateString('fr-FR')} 20h → ${fridayEnd.toLocaleDateString('fr-FR')} 20h`
  }
  const getKey = (dateStr) => {
    if (!dateStr) return 'Inconnu'
    const d = new Date(dateStr)
    if (periode === 'jour') return d.toLocaleDateString('fr-FR')
    if (periode === 'mois') { const m = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']; return `${m[d.getMonth()]} ${d.getFullYear()}` }
    return getRpWeekKey(dateStr)
  }

  // Group by period
  const grouped = useMemo(() => {
    const map = {}
    allLog.forEach(e => {
      const key = getKey(e.date)
      if (!map[key]) map[key] = { key, soins: 0, visites: 0, hosp: 0, vaccins: 0, blessures: 0, total: 0, entries: [], medecins: new Set(), patients: new Set() }
      map[key].total++; map[key].entries.push(e)
      if (e.medecin !== '—') map[key].medecins.add(e.medecin)
      if (e.patient !== 'Anonyme' && e.patient !== '—') map[key].patients.add(e.patient)
      if (e.type === 'Soin') map[key].soins++; else if (e.type === 'Visite') map[key].visites++
      else if (e.type === 'Hosp.') map[key].hosp++; else if (e.type === 'Vaccin') map[key].vaccins++
      else if (e.type === 'Blessure') map[key].blessures++
    })
    return Object.values(map)
  }, [allLog, periode])

  // Medecin summary
  const medecinStats = useMemo(() => {
    const map = {}
    allLog.forEach(e => {
      if (e.medecin === '—') return
      if (!map[e.medecin]) map[e.medecin] = { nom: e.medecin, soins: 0, visites: 0, hosp: 0, vaccins: 0, total: 0, patients: new Set(), entries: [], firstDate: e.date, lastDate: e.date }
      const m = map[e.medecin]
      m.total++; m.entries.push(e)
      if (e.patient !== 'Anonyme' && e.patient !== '—') m.patients.add(e.patient)
      if (e.type === 'Soin') m.soins++; else if (e.type === 'Visite') m.visites++
      else if (e.type === 'Hosp.') m.hosp++; else if (e.type === 'Vaccin') m.vaccins++
      if (e.date && (!m.firstDate || e.date < m.firstDate)) m.firstDate = e.date
      if (e.date && (!m.lastDate || e.date > m.lastDate)) m.lastDate = e.date
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [allLog])

  // Patient list
  const patientList = useMemo(() => {
    const map = {}
    allLog.forEach(e => {
      if (e.patient === 'Anonyme' || e.patient === '—') return
      if (!map[e.patient]) map[e.patient] = { nom: e.patient, count: 0, entries: [] }
      map[e.patient].count++; map[e.patient].entries.push(e)
    })
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [allLog])

  const totals = useMemo(() => {
    const t = { soins: 0, visites: 0, hosp: 0, vaccins: 0, blessures: 0 }
    allLog.forEach(e => { if (e.type === 'Soin') t.soins++; else if (e.type === 'Visite') t.visites++; else if (e.type === 'Hosp.') t.hosp++; else if (e.type === 'Vaccin') t.vaccins++; else if (e.type === 'Blessure') t.blessures++ })
    return t
  }, [allLog])

  // Soins breakdown by type_soin
  const soinsBreakdown = useMemo(() => {
    const map = {}
    soins.forEach(s => {
      const t = s.type_soin || 'Non précisé'
      map[t] = (map[t] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [soins])

  // Top medecin by soins count
  const topMedecinSoins = useMemo(() => {
    const map = {}
    soins.forEach(s => {
      const nom = s.medecin_nom || 'Inconnu'
      map[nom] = (map[nom] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [soins])

  // Build medecin patient breakdown
  const getMedecinPatients = (entries) => {
    const map = {}
    entries.forEach(e => {
      const key = e.patient
      if (!map[key]) map[key] = { nom: key, soins: 0, visites: 0, hosp: 0, vaccins: 0, total: 0, lastDate: e.date }
      map[key].total++
      if (e.type === 'Soin') map[key].soins++; else if (e.type === 'Visite') map[key].visites++
      else if (e.type === 'Hosp.') map[key].hosp++; else if (e.type === 'Vaccin') map[key].vaccins++
      if (e.date > map[key].lastDate) map[key].lastDate = e.date
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  const handleExportPdf = async (id, filename) => {
    setExporting(true)
    await new Promise(r => setTimeout(r, 300))
    await exportToPdf(id, filename)
    setExporting(false)
  }

  // ======== POPUP: Fiche médecin ========
  const renderMedecinPopup = () => {
    if (!selectedMedecin) return null
    const med = selectedMedecin
    const patients = getMedecinPatients(med.entries)
    const anonymeCount = med.entries.filter(e => e.patient === 'Anonyme').length

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '30px 10px', overflowY: 'auto' }}
        onClick={e => { if (e.target === e.currentTarget) setSelectedMedecin(null) }}>
        <div id="medecin-report" style={{ maxWidth: 900, width: '100%', background: 'var(--parchment)', borderRadius: 8, padding: 'var(--space-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid var(--military-green)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>Sanitätsdienst — 7. Armeekorps</div>
            <h2 style={{ margin: 'var(--space-sm) 0', fontSize: '1.4rem' }}>📋 Rapport d'activité médicale</h2>
            <h3 style={{ margin: 0, color: 'var(--military-green)', fontSize: '1.2rem' }}>{med.nom}</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>Généré le {nowStr}</div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
            <button className="btn btn-primary" disabled={exporting} onClick={() => handleExportPdf('medecin-report', `rapport-${med.nom.replace(/\s/g, '_')}`)}>
              {exporting ? '⏳' : '📄 Télécharger PDF'}
            </button>
            <button className="btn btn-secondary" onClick={() => setSelectedMedecin(null)}>✕ Fermer</button>
          </div>

          {/* Résumé chiffré */}
          <div className="paper-card" style={{ marginBottom: 'var(--space-lg)', background: 'rgba(75,83,32,0.05)' }}>
            <h4 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-xs)' }}>Résumé d'activité</h4>
            <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { icon: '⚕️', label: 'Soins au front', val: med.soins },
                { icon: '🏥', label: 'Visites', val: med.visites },
                { icon: '🏨', label: 'Hospitalisations', val: med.hosp },
                { icon: '💉', label: 'Vaccinations', val: med.vaccins },
                { icon: '📋', label: 'Total actes', val: med.total },
                { icon: '👥', label: 'Patients', val: med.patients.size },
              ].map((c, i) => (
                <div key={i} style={{ textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontSize: '1.1rem' }}>{c.icon}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--military-green)' }}>{c.val}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-xl)', marginTop: 'var(--space-md)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Premier acte : {fmtDate(med.firstDate)}</span>
              <span>Dernier acte : {fmtDate(med.lastDate)}</span>
            </div>
          </div>

          {/* Patients traités */}
          <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h4 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-xs)' }}>👥 Patients traités</h4>
            <table className="table">
              <thead><tr><th>Patient</th><th>⚕️</th><th>🏥</th><th>🏨</th><th>💉</th><th>Total</th><th>Dernier soin</th></tr></thead>
              <tbody>
                {patients.map((p, i) => (
                  <tr key={i} style={{ fontStyle: p.nom === 'Anonyme' ? 'italic' : 'normal', color: p.nom === 'Anonyme' ? 'var(--text-muted)' : '' }}>
                    <td style={{ fontWeight: 600 }}>{p.nom}</td>
                    <td>{p.soins || '—'}</td>
                    <td>{p.visites || '—'}</td>
                    <td>{p.hosp || '—'}</td>
                    <td>{p.vaccins || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{p.total}</td>
                    <td style={{ fontSize: '0.8rem' }}>{fmtDate(p.lastDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Journal complet */}
          <div className="paper-card">
            <h4 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-xs)' }}>🕐 Journal complet des actes</h4>
            <table className="table">
              <thead><tr><th>Date/Heure</th><th>Type</th><th>Patient</th><th>Détail</th><th>Notes</th></tr></thead>
              <tbody>
                {med.entries.map((e, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{fmt(e.date)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{e.icon} {e.type}</td>
                    <td style={{ fontWeight: 600 }}>{e.patient}</td>
                    <td style={{ fontSize: '0.8rem' }}>{e.detail || '—'}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Archives 7e Armeekorps — Sanitätsdienst — Rapport généré automatiquement
          </div>
        </div>
      </div>
    )
  }

  // ======== POPUP: Fiche effectif ========
  const renderEffectifPopup = () => {
    if (!selectedEffectif) return null
    const p = selectedEffectif
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '30px 10px', overflowY: 'auto' }}
        onClick={e => { if (e.target === e.currentTarget) setSelectedEffectif(null) }}>
        <div id="effectif-report" style={{ maxWidth: 800, width: '100%', background: 'var(--parchment)', borderRadius: 8, padding: 'var(--space-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid var(--military-green)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>Sanitätsdienst — 7. Armeekorps</div>
            <h2 style={{ margin: 'var(--space-sm) 0' }}>📋 Fiche médicale</h2>
            <h3 style={{ margin: 0, color: 'var(--military-green)' }}>{p.nom}</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>Généré le {nowStr}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
            <button className="btn btn-primary" disabled={exporting} onClick={() => handleExportPdf('effectif-report', `fiche-${p.nom.replace(/\s/g, '_')}`)}>
              {exporting ? '⏳' : '📄 Télécharger PDF'}
            </button>
            <button className="btn btn-secondary" onClick={() => setSelectedEffectif(null)}>✕ Fermer</button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Soin', 'Visite', 'Hosp.', 'Vaccin', 'Blessure'].map(t => {
              const c = p.entries.filter(e => e.type === t).length
              return c > 0 ? <div key={t} style={{ textAlign: 'center' }}><div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--military-green)' }}>{c}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t}{c > 1 ? 's' : ''}</div></div> : null
            })}
          </div>
          <table className="table">
            <thead><tr><th>Date</th><th>Type</th><th>Médecin</th><th>Détail</th><th>Notes</th></tr></thead>
            <tbody>
              {p.entries.map((e, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{fmt(e.date)}</td>
                  <td>{e.icon} {e.type}</td>
                  <td>{e.medecin}</td>
                  <td style={{ fontSize: '0.8rem' }}>{e.detail || '—'}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Archives 7e Armeekorps — Sanitätsdienst — Fiche générée automatiquement
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <BackButton label="← Service médical" to="/medical" />
      <h1 style={{ textAlign: 'center', margin: 'var(--space-lg) 0' }}>📊 Rapport de service médical</h1>

      {renderMedecinPopup()}
      {renderEffectifPopup()}

      <div id="medical-report">
        {/* Totaux */}
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
            {[
              { icon: '⚕️', label: 'Soins', val: totals.soins },
              { icon: '🏥', label: 'Visites', val: totals.visites },
              { icon: '🏨', label: 'Hosp.', val: totals.hosp },
              { icon: '💉', label: 'Vaccins', val: totals.vaccins },
              { icon: '🩹', label: 'Blessures', val: totals.blessures },
              { icon: '📋', label: 'Total', val: allLog.length },
            ].map((c, i) => (
              <div key={i} style={{ textAlign: 'center', minWidth: 60 }}>
                <div style={{ fontSize: '1.2rem' }}>{c.icon}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--military-green)' }}>{c.val}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Détail des soins au front */}
        {soins.length > 0 && (
          <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ marginTop: 0 }}>⚕️ Détail des soins au front</h3>
            <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
              {/* Breakdown by type */}
              <div style={{ flex: 1, minWidth: 250 }}>
                <h4 style={{ marginTop: 0, fontSize: '0.9rem' }}>Par type de soin</h4>
                <table className="table">
                  <thead><tr><th>Type</th><th>Nombre</th><th>%</th></tr></thead>
                  <tbody>
                    {soinsBreakdown.map(([type, count]) => (
                      <tr key={type}>
                        <td style={{ fontWeight: 600 }}>{type}</td>
                        <td>{count}</td>
                        <td>{(count / soins.length * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Visual bar chart */}
              <div style={{ flex: 1, minWidth: 250 }}>
                <h4 style={{ marginTop: 0, fontSize: '0.9rem' }}>Répartition</h4>
                {soinsBreakdown.map(([type, count]) => (
                  <div key={type} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2 }}>
                      <span>{type}</span><span style={{ fontWeight: 700 }}>{count}</span>
                    </div>
                    <div style={{ height: 14, background: 'var(--bg-darker)', borderRadius: 7, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(count / soins.length * 100)}%`, background: 'var(--military-green)', borderRadius: 7, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Top medecins soins */}
            {topMedecinSoins.length > 0 && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <h4 style={{ fontSize: '0.9rem' }}>🏅 Classement soins au front</h4>
                <div style={{ display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
                  {topMedecinSoins.slice(0, 5).map(([nom, count], i) => (
                    <div key={nom} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'}</div>
                      <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--military-green)' }}>{count}</div>
                      <div style={{ fontSize: '0.75rem' }}>{nom}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activité par médecin — CLICKABLE */}
        {medecinStats.length > 0 && (
          <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ marginTop: 0 }}>🏅 Médecins — Cliquez pour le rapport complet</h3>
            <table className="table">
              <thead><tr><th>Médecin</th><th>⚕️</th><th>🏥</th><th>🏨</th><th>💉</th><th>Total</th><th>Patients</th><th></th></tr></thead>
              <tbody>
                {medecinStats.map((m, i) => (
                  <tr key={m.nom} style={{ cursor: 'pointer' }} onClick={() => setSelectedMedecin(m)}>
                    <td style={{ fontWeight: 600 }}>{i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}{m.nom}</td>
                    <td>{m.soins || '—'}</td>
                    <td>{m.visites || '—'}</td>
                    <td>{m.hosp || '—'}</td>
                    <td>{m.vaccins || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{m.total}</td>
                    <td>{m.patients.size}</td>
                    <td style={{ color: 'var(--military-green)', fontSize: '0.8rem' }}>📋 Rapport →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Effectifs traités — CLICKABLE */}
        {patientList.length > 0 && (
          <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ marginTop: 0 }}>👥 Effectifs traités — Cliquez pour la fiche</h3>
            <table className="table">
              <thead><tr><th>Effectif</th><th>Actes</th><th></th></tr></thead>
              <tbody>
                {patientList.map(p => (
                  <tr key={p.nom} style={{ cursor: 'pointer' }} onClick={() => setSelectedEffectif(p)}>
                    <td style={{ fontWeight: 600 }}>{p.nom}</td>
                    <td>{p.count}</td>
                    <td style={{ color: 'var(--military-green)', fontSize: '0.8rem' }}>📋 Fiche →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Période selector + PDF global */}
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Période :</span>
              {[{ key: 'jour', label: '📅 Jour' }, { key: 'semaine', label: '📆 Sem. RP' }, { key: 'mois', label: '🗓️ Mois' }].map(p => (
                <button key={p.key} className={`btn ${periode === p.key ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                  onClick={() => { setPeriode(p.key); setExpandedKey(null); setFilterPeriode('') }}>
                  {p.label}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" disabled={exporting} onClick={() => { setExpandedKey('__ALL__'); setTimeout(() => handleExportPdf('medical-report', `rapport-medical-${periode}`), 400) }}>
              {exporting ? '⏳' : '📄 PDF global'}
            </button>
          </div>
          {periode === 'semaine' && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 'var(--space-xs) 0 0' }}>Semaine RP : Vendredi 20h → Vendredi 20h</p>}

          {/* Sélecteur de période spécifique */}
          {grouped.length > 0 && (
            <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Afficher :</span>
              <select className="form-input" style={{ width: 'auto', minWidth: 180 }} value={filterPeriode} onChange={e => setFilterPeriode(e.target.value)}>
                <option value="">Toutes les périodes</option>
                {grouped.map(g => <option key={g.key} value={g.key}>{g.key} ({g.total} actes)</option>)}
              </select>
              {filterPeriode && <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => setFilterPeriode('')}>✕ Reset</button>}
            </div>
          )}
        </div>

        {/* Tableau récap */}
        <div className="paper-card">
          <h3 style={{ marginTop: 0 }}>📋 Récapitulatif {periode === 'jour' ? 'journalier' : periode === 'semaine' ? 'hebdomadaire (sem. RP)' : 'mensuel'}{filterPeriode ? ` — ${filterPeriode}` : ''}</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{periode === 'jour' ? 'Date' : periode === 'semaine' ? 'Semaine RP' : 'Mois'}</th>
                  <th>⚕️</th><th>🏥</th><th>🏨</th><th>💉</th><th>🩹</th><th>Total</th><th>Médecins</th><th>Patients</th>
                </tr>
              </thead>
              <tbody>
                {grouped.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune donnée</td></tr>
                ) : grouped.filter(g => !filterPeriode || g.key === filterPeriode).map(g => {
                  const isExp = expandedKey === g.key || expandedKey === '__ALL__' || !!filterPeriode
                  return (
                    <>{/* */}
                      <tr key={g.key} style={{ cursor: 'pointer', background: isExp ? 'rgba(75,83,32,0.08)' : '' }}
                        onClick={() => setExpandedKey(isExp && expandedKey !== '__ALL__' ? null : g.key)}>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{g.key}</td>
                        <td>{g.soins || '—'}</td><td>{g.visites || '—'}</td><td>{g.hosp || '—'}</td>
                        <td>{g.vaccins || '—'}</td><td>{g.blessures || '—'}</td>
                        <td style={{ fontWeight: 700 }}>{g.total}</td>
                        <td style={{ fontSize: '0.75rem' }}>{[...g.medecins].join(', ') || '—'}</td>
                        <td>{g.patients.size}</td>
                      </tr>
                      {isExp && g.entries.map((e, i) => (
                        <tr key={`${g.key}-${i}`} style={{ background: 'rgba(75,83,32,0.04)', fontSize: '0.85rem' }}>
                          <td style={{ paddingLeft: 20, whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmt(e.date)}</td>
                          <td colSpan={2}>{e.icon} {e.type}</td>
                          <td>{e.medecin}</td>
                          <td>{e.patient}</td>
                          <td colSpan={2} style={{ fontSize: '0.75rem' }}>{e.detail || '—'}</td>
                          <td colSpan={2} style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{e.notes || ''}</td>
                        </tr>
                      ))}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
