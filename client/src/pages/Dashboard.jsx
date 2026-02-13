import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import apiClient from '../api/client'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ effectifs: 0, rapports: 0, unites: 0, parUnite: [], derniers: [] })

  useEffect(() => {
    apiClient.get('/stats').then(r => setStats(s => ({ ...s, ...r.data }))).catch(() => {})
  }, [])

  const navCards = [
    { icon: '📋', title: 'Effectifs', desc: `${stats.effectifs} soldats enregistrés`, to: '/effectifs' },
    { icon: '📝', title: 'Rapports', desc: `${stats.rapports} rapports officiels`, to: '/rapports' },
    { icon: '⏱️', title: 'PDS', desc: 'Prise De Service', to: '/pds' },
    { icon: '🚫', title: 'Interdits de front', desc: 'Sanctions & restrictions', to: '/interdits' },
    { icon: '🏥', title: 'Médical', desc: 'Visites médicales', to: '/medical' },
    { icon: '📚', title: 'Documentation', desc: 'Liens & règlements', to: '/documentation' },
    { icon: '🔎', title: 'Recherche', desc: 'Recherche globale', to: '/search' },
  ]

  if (user?.isAdmin) {
    navCards.push({ icon: '⚙️', title: 'Administration', desc: 'Gestion des utilisateurs', to: '/admin/users', admin: true })
  }

  const typeLabels = { rapport: '📋', recommandation: '⭐', incident: '⚠️' }

  return (
    <>
      
      <div className="container" >
        {/* En-tête */}
        <div className="paper-card" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <h1 style={{ marginBottom: 'var(--space-xs)' }}>Archives 7e Armeekorps</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            {user?.grade || ''} {user?.username || ''} — {user?.unite || 'Commandement'}
          </p>
        </div>

        {/* Stats globales */}
        <div className="grid grid-cols-3" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="paper-card stat-card">
            <div className="stat-number">{stats.effectifs}</div>
            <div className="stat-label">Effectifs</div>
          </div>
          <div className="paper-card stat-card">
            <div className="stat-number">{stats.rapports}</div>
            <div className="stat-label">Rapports</div>
          </div>
          <div className="paper-card stat-card">
            <div className="stat-number">{stats.unites}</div>
            <div className="stat-label">Unités</div>
          </div>
        </div>

        {/* Effectifs par unité */}
        {stats.parUnite && stats.parUnite.length > 0 && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>Effectifs par unité</h2>
            <div className="paper-card">
              {stats.parUnite.map((u, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-xs) 0', borderBottom: i < stats.parUnite.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <span className="unit-dot" style={{ background: u.couleur || 'var(--military-green)' }}></span>
                  <span style={{ flex: 1, fontSize: '0.85rem' }}>{u.code}. {u.nom}</span>
                  <strong style={{ fontSize: '0.85rem' }}>{u.count}</strong>
                  <div style={{ width: '120px', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (u.count / Math.max(1, stats.effectifs)) * 100)}%`, height: '100%', background: u.couleur || 'var(--military-green)', borderRadius: '4px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Derniers rapports */}
        {stats.derniers && stats.derniers.length > 0 && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>Derniers rapports</h2>
            <div className="paper-card" style={{ overflow: 'auto' }}>
              {stats.derniers.map((r, i) => (
                <Link to={`/rapports/${r.id}`} key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm) 0', borderBottom: i < stats.derniers.length - 1 ? '1px solid var(--border-color)' : 'none', textDecoration: 'none', color: 'inherit' }}>
                  <span>{typeLabels[r.type] || '📋'}</span>
                  <span style={{ flex: 1, fontSize: '0.85rem' }}>{r.titre}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.auteur_nom || '—'}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.date_irl || ''}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="grid grid-cols-3" style={{ gap: 'var(--space-lg)' }}>
          {navCards.map((card, i) => (
            <Link to={card.to} key={i} className="paper-card unit-card" style={{
              textAlign: 'center', textDecoration: 'none',
              ...(card.admin ? { borderColor: 'var(--warning)', background: 'rgba(161, 124, 71, 0.05)' } : {})
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>{card.icon}</div>
              <h3 style={{ margin: '0 0 var(--space-xs)' }}>{card.title}</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{card.desc}</p>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Archives du 7e Armeekorps — Commandement de la 916. Grenadier-Regiment<br />
          Accès réservé aux personnels autorisés
        </div>
      </div>
    </>
  )
}
