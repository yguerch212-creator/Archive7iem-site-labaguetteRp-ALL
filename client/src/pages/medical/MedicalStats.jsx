import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'

export default function MedicalStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/medical-soldbuch/stats').then(r => setStats(r.data.data)).catch(() => {})
  }, [])

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

      {/* Soins par médecin */}
      {stats.soins_par_medecin?.length > 0 && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ marginTop: 0 }}>🏅 Classement des médecins — Soins effectués</h3>
          <table className="table">
            <thead><tr><th>#</th><th>Médecin</th><th>Soins</th><th>Jours actifs</th><th>Moyenne/jour</th></tr></thead>
            <tbody>
              {stats.soins_par_medecin.map((m, i) => (
                <tr key={m.medecin_id}>
                  <td style={{ fontWeight: 700 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                  <td>{m.medecin_nom}</td>
                  <td style={{ fontWeight: 700 }}>{m.total}</td>
                  <td>{m.jours_actifs}</td>
                  <td>{(m.total / Math.max(1, m.jours_actifs)).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Soins par jour */}
      {stats.soins_par_jour?.length > 0 && (
        <div className="paper-card">
          <h3 style={{ marginTop: 0 }}>📅 Soins par jour (30 derniers jours)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
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
