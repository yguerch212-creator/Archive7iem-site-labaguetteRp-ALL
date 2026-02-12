import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import apiClient from '../api/client'
import Topbar from '../components/layout/Topbar'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ effectifs: 0, rapports: 0, unites: 0 })

  useEffect(() => {
    apiClient.get('/stats').then(r => setStats(r.data)).catch(() => {})
  }, [])

  const cards = [
    { icon: '📋', title: 'Effectifs', desc: `${stats.effectifs} soldats enregistrés`, to: '/effectifs' },
    { icon: '📝', title: 'Rapports', desc: `${stats.rapports} rapports officiels`, to: '/rapports' },
    { icon: '📁', title: 'Dossiers', desc: 'Documents classifiés', to: '/search' },
    { icon: '⚖️', title: 'Casiers', desc: 'Casiers judiciaires', to: '/search?filter=casier' },
    { icon: '🔎', title: 'Recherche', desc: 'Recherche globale', to: '/search' },
  ]

  if (user?.isAdmin) {
    cards.push({ icon: '⚙️', title: 'Administration', desc: 'Gestion des utilisateurs', to: '/admin/users', admin: true })
  }

  return (
    <>
      <Topbar />
      <div className="container" style={{ marginTop: 'var(--space-xxl)' }}>
        <div className="paper-card" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <h1 style={{ marginBottom: 'var(--space-xs)' }}>Archives 7e Armeekorps</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            {user?.grade || ''} {user?.username || ''} — {user?.unite || 'Commandement'}
          </p>
        </div>

        <div className="grid grid-cols-3" style={{ gap: 'var(--space-lg)' }}>
          {cards.map((card, i) => (
            <Link to={card.to} key={i} className="paper-card" style={{
              textAlign: 'center',
              textDecoration: 'none',
              cursor: 'pointer',
              ...(card.admin ? { borderColor: 'var(--warning)', background: 'rgba(161, 124, 71, 0.05)' } : {})
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>{card.icon}</div>
              <h3 style={{ margin: '0 0 var(--space-xs)' }}>{card.title}</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{card.desc}</p>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-xxl)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Archives du 7e Armeekorps — Commandement de la 916. Grenadier-Regiment<br />
          Accès réservé aux personnels autorisés
        </div>
      </div>
    </>
  )
}
