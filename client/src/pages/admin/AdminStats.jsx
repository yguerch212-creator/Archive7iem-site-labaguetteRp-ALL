import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import api from '../../api/client'

export default function AdminStats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data)).catch(() => {})
  }, [])

  if (!stats) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <BackButton label="← Tableau de bord" />
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>📊 Statistiques</h1>

      <div className="grid grid-cols-3" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="paper-card" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--military-green)' }}>{stats.effectifs}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Effectifs</div>
        </div>
        <div className="paper-card" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--military-green)' }}>{stats.rapports}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Rapports</div>
        </div>
        <div className="paper-card" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--military-green)' }}>{stats.unites}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Unités</div>
        </div>
      </div>

      <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>Effectifs par unité</h2>
      <div className="paper-card" style={{ marginBottom: 'var(--space-xl)' }}>
        {(stats.parUnite || []).map((u, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-xs) var(--space-md)', borderBottom: i < stats.parUnite.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
            <span className="unit-dot" style={{ background: u.couleur || 'var(--military-green)' }}></span>
            <span style={{ flex: 1, fontSize: '0.85rem' }}>{u.code}. {u.nom}</span>
            <strong>{u.count}</strong>
            <div style={{ width: 150, height: 10, background: 'var(--border-color)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (u.count / Math.max(1, stats.effectifs)) * 100)}%`, height: '100%', background: u.couleur || 'var(--military-green)', borderRadius: 5 }}></div>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>Derniers rapports</h2>
      <div className="paper-card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={th}>Type</th>
              <th style={th}>Titre</th>
              <th style={th}>Auteur</th>
              <th style={th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {(stats.derniers || []).map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={td}>{r.type === 'rapport' ? '📋' : r.type === 'recommandation' ? '⭐' : '⚠️'} {r.type}</td>
                <td style={td}>{r.titre}</td>
                <td style={td}>{r.auteur_nom || '—'}</td>
                <td style={td}>{r.date_irl ? new Date(r.date_irl + 'T00:00').toLocaleDateString('fr-FR') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)' }
const td = { padding: 'var(--space-sm) var(--space-md)' }
