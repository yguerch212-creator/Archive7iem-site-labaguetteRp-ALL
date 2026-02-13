import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import apiClient from '../api/client'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ effectifs: 0, rapports: 0, unites: 0, parUnite: [], derniers: [] })
  const [pending, setPending] = useState({ docs: 0, permissions: 0, total: 0 })

  const isPrivileged = user?.isAdmin || user?.isRecenseur || user?.isOfficier

  useEffect(() => {
    apiClient.get('/stats').then(r => setStats(s => ({ ...s, ...r.data }))).catch(() => {})
    if (isPrivileged) {
      apiClient.get('/stats/pending').then(r => setPending(r.data)).catch(() => {})
    }
  }, [])

  const navCards = [
    { icon: '📋', title: 'Effectifs', desc: 'Fiches & soldbücher', to: '/effectifs' },
    { icon: '📝', title: 'Rapports', desc: 'Rapports officiels', to: '/rapports' },
    { icon: '⏱️', title: 'PDS', desc: 'Prise De Service', to: '/pds' },
    { icon: '🚫', title: 'Interdits de front', desc: 'Sanctions & restrictions', to: '/interdits' },
    { icon: '🏥', title: 'Médical', desc: 'Visites médicales', to: '/medical' },
    { icon: '📁', title: 'Dossiers', desc: 'Dossiers & enquêtes', to: '/dossiers' },
    { icon: '⚖️', title: 'Justice Militaire', desc: 'Affaires, enquêtes & tribunal', to: '/sanctions' },
    { icon: '⚡', title: 'Télégrammes', desc: 'Messages entre unités', to: '/telegrammes' },
    { icon: '📚', title: 'Documentation', desc: 'Liens & règlements', to: '/documentation' },
    { icon: '🔎', title: 'Recherche', desc: 'Recherche globale', to: '/search' },
  ]

  if (user?.isAdmin || user?.isOfficier || user?.isRecenseur) {
    navCards.push({ icon: '🔔', title: 'Validation', desc: 'Modération & validation', to: '/admin/moderation' })
  }
  if (user?.isAdmin) {
    navCards.push({ icon: '📊', title: 'Statistiques', desc: 'Vue d\'ensemble', to: '/admin/stats' })
    navCards.push({ icon: '⚙️', title: 'Administration', desc: 'Utilisateurs & permissions', to: '/admin/users' })
  }

  return (
    <div className="container">
      {/* En-tête */}
      <div className="paper-card" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ marginBottom: 'var(--space-xs)' }}>Archives 7e Armeekorps</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          {user?.grade || ''} {user?.username || ''} — {user?.unite || 'Commandement'}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Ce site est dédié à la simulation RP (jeu de rôle) — Aucune affiliation avec des mouvements historiques ou politiques.
        </p>
      </div>

      {/* Validation queue (privileged only) */}
      {isPrivileged && pending.total > 0 && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-xl)', borderLeft: '3px solid var(--warning)' }}>
          <h3 style={{ margin: '0 0 var(--space-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
            🔔 En attente de validation
            <span style={{ background: 'var(--danger)', color: 'white', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>{pending.total}</span>
          </h3>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            {pending.docs > 0 && (
              <Link to="/documentation" className="btn btn-sm btn-secondary">📚 {pending.docs} document{pending.docs > 1 ? 's' : ''} à valider</Link>
            )}
            {pending.permissions > 0 && (
              <Link to="/pds" className="btn btn-sm btn-secondary">🏖️ {pending.permissions} permission{pending.permissions > 1 ? 's' : ''} en attente</Link>
            )}
            {pending.media > 0 && (
              <Link to="/admin/moderation" className="btn btn-sm btn-secondary">📸 {pending.media} média{pending.media > 1 ? 's' : ''} à modérer</Link>
            )}
            {pending.medical > 0 && (
              <Link to="/medical" className="btn btn-sm btn-secondary">🏥 {pending.medical} visite{pending.medical > 1 ? 's' : ''} à valider</Link>
            )}
          </div>
        </div>
      )}

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

      {/* Navigation */}
      <div className="grid grid-cols-3" style={{ gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        {navCards.map((card, i) => (
          <Link to={card.to} key={i} className="paper-card unit-card" style={{ textAlign: 'center', textDecoration: 'none' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>{card.icon}</div>
            <h3 style={{ margin: '0 0 var(--space-xs)' }}>{card.title}</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{card.desc}</p>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-md)' }}>
        <p style={{ margin: '0 0 4px' }}>
          Ce site est dédié exclusivement à la simulation RP (jeu de rôle) sur Garry's Mod — Serveur « Axe | LaBaguetteRP »
        </p>
        <p style={{ margin: '0 0 4px' }}>Accès réservé aux personnels autorisés</p>
        <p style={{ margin: '0 0 8px', fontSize: '0.7rem' }}>
          Développement & modération : <strong>thomaslewis5395</strong> (Discord)
        </p>
        <p style={{ margin: 0, fontSize: '0.65rem', fontStyle: 'italic' }}>
          Les données collectées (pseudonymes Discord, données RP fictives) sont utilisées uniquement dans le cadre du jeu de rôle.
          Aucune donnée personnelle réelle n'est traitée. Contact : thomaslewis5395 sur Discord.
        </p>
      </div>
    </div>
  )
}
