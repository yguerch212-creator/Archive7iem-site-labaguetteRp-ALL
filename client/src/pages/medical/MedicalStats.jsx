import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'

export default function MedicalStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [selectedMedecin, setSelectedMedecin] = useState(null) // { id, nom }
  const [medecinSoins, setMedecinSoins] = useState([])
  const [medecinPatients, setMedecinPatients] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    api.get('/medical-soldbuch/stats').then(r => setStats(r.data.data)).catch(() => {})
  }, [])

  const openMedecin = async (med) => {
    setSelectedMedecin(med)
    setLoadingDetail(true)
    try {
      const res = await api.get('/medical-soldbuch/soins', { params: { medecin_id: med.medecin_id } })
      const soins = res.data.data || []
      setMedecinSoins(soins)
      // Aggregate patients
      const patMap = {}
      soins.forEach(s => {
        const key = s.patient_nom || 'Anonyme'
        if (!patMap[key]) patMap[key] = { nom: key, count: 0, dernierSoin: s.date_soin, types: {} }
        patMap[key].count++
        patMap[key].types[s.type_soin] = (patMap[key].types[s.type_soin] || 0) + 1
        if (s.date_soin > patMap[key].dernierSoin) patMap[key].dernierSoin = s.date_soin
      })
      setMedecinPatients(Object.values(patMap).sort((a, b) => b.count - a.count))
    } catch {}
    setLoadingDetail(false)
  }

  const fmt = (d) => {
    if (!d) return '—'
    try { const dt = new Date(d); return dt.toLocaleDateString('fr-FR') + ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) } catch { return d }
  }
  const fmtDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d } }

  if (!stats) return <div className="container"><BackButton label="← Service médical" to="/medical" /><p style={{ textAlign: 'center', marginTop: 40 }}>Chargement...</p></div>

  return (
    <div className="container">
      <BackButton label="← Service médical" to="/medical" />
      <h1 style={{ textAlign: 'center', margin: 'var(--space-lg) 0' }}>📊 Statistiques médicales</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-3" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {[
          { icon: '⚕️', label: 'Soins au front', value: stats.soins_total },
          { icon: '🏥', label: 'Visites médicales', value: stats.visites_total },
          { icon: '🏨', label: 'Hospitalisations', value: stats.hospitalisations_total },
          { icon: '🩹', label: 'Blessures', value: stats.blessures_total },
          { icon: '💉', label: 'Vaccinations', value: stats.vaccinations_total },
        ].map((c, i) => (
          <div key={i} className="paper-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem' }}>{c.icon}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--military-green)' }}>{c.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Classement médecins — clickable */}
      {stats.soins_par_medecin?.length > 0 && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ marginTop: 0 }}>🏅 Classement des médecins — Cliquez pour voir le détail</h3>
          <table className="table">
            <thead><tr><th>#</th><th>Médecin</th><th>Soins</th><th>Jours actifs</th><th>Moy./jour</th><th></th></tr></thead>
            <tbody>
              {stats.soins_par_medecin.map((m, i) => (
                <tr key={m.medecin_id} style={{ cursor: 'pointer', background: selectedMedecin?.medecin_id === m.medecin_id ? 'rgba(75,83,32,0.1)' : '' }} onClick={() => openMedecin(m)}>
                  <td style={{ fontWeight: 700 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{m.medecin_nom}</td>
                  <td style={{ fontWeight: 700, fontSize: '1.1rem' }}>{m.total}</td>
                  <td>{m.jours_actifs}</td>
                  <td>{(m.total / Math.max(1, m.jours_actifs)).toFixed(1)}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--military-green)' }}>→ Détail</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail view for selected medecin */}
      {selectedMedecin && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-xl)', borderLeft: '3px solid var(--military-green)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ marginTop: 0 }}>📋 Détail — {selectedMedecin.medecin_nom}</h3>
            <button className="btn btn-secondary btn-small" onClick={() => setSelectedMedecin(null)}>✕ Fermer</button>
          </div>

          {loadingDetail ? <p>Chargement...</p> : <>
            {/* Summary */}
            <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--military-green)' }}>{medecinSoins.length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Soins total</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--military-green)' }}>{medecinPatients.filter(p => p.nom !== 'Anonyme').length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patients identifiés</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--military-green)' }}>{medecinPatients.find(p => p.nom === 'Anonyme')?.count || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Soins anonymes</div>
              </div>
            </div>

            {/* Patients breakdown */}
            <h4 style={{ margin: '0 0 var(--space-sm)' }}>👥 Patients soignés</h4>
            <table className="table" style={{ marginBottom: 'var(--space-lg)' }}>
              <thead><tr><th>Patient</th><th>Nombre de soins</th><th>Types</th><th>Dernier soin</th></tr></thead>
              <tbody>
                {medecinPatients.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: p.nom === 'Anonyme' ? 'normal' : 600, fontStyle: p.nom === 'Anonyme' ? 'italic' : 'normal', color: p.nom === 'Anonyme' ? 'var(--text-muted)' : '' }}>{p.nom}</td>
                    <td style={{ fontWeight: 700 }}>{p.count}</td>
                    <td style={{ fontSize: '0.75rem' }}>{Object.entries(p.types).map(([t, c]) => `${t} (${c})`).join(', ')}</td>
                    <td style={{ fontSize: '0.8rem' }}>{fmtDate(p.dernierSoin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Recent soins */}
            <h4 style={{ margin: '0 0 var(--space-sm)' }}>🕐 Derniers soins</h4>
            <table className="table">
              <thead><tr><th>Date/Heure</th><th>Patient</th><th>Type</th><th>Notes</th></tr></thead>
              <tbody>
                {medecinSoins.slice(0, 50).map(s => (
                  <tr key={s.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{fmt(s.date_soin)}</td>
                    <td>{s.patient_nom || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Anonyme</span>}</td>
                    <td>{s.type_soin}</td>
                    <td style={{ fontSize: '0.8rem' }}>{s.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>}
        </div>
      )}

      {/* Soins par jour graph */}
      {stats.soins_par_jour?.length > 0 && (
        <div className="paper-card">
          <h3 style={{ marginTop: 0 }}>📅 Soins par jour (30 derniers jours)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, marginBottom: 20 }}>
            {stats.soins_par_jour.slice().reverse().map((d, i) => {
              const max = Math.max(...stats.soins_par_jour.map(x => x.total), 1)
              const h = (d.total / max) * 100
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.6rem', marginBottom: 2 }}>{d.total}</div>
                  <div style={{ width: '100%', height: h, background: 'var(--military-green)', borderRadius: '2px 2px 0 0', minHeight: 2 }} />
                  <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', marginTop: 2, transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                    {new Date(d.jour).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
