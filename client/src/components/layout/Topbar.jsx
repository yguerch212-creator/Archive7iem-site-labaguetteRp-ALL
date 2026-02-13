import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'

export default function Topbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [unreadTel, setUnreadTel] = useState(0)

  useEffect(() => {
    if (user?.effectif_id && !user?.isGuest) {
      api.get('/telegrammes', { params: { tab: 'recu' } })
        .then(r => setUnreadTel(r.data.unread || 0))
        .catch(() => {})
    }
  }, [location.pathname])

  const isActive = (path) => location.pathname.startsWith(path) ? 'active' : ''

  return (
    <div className="topbar">
      <div className="container topbar-content">
        <Link to="/dashboard" className="topbar-logo">
          ✠ Archives 7e Armeekorps
        </Link>
        
        <nav className="topbar-nav">
          <Link to="/dashboard" className={isActive('/dashboard')}>Tableau de bord</Link>
          <Link to="/effectifs" className={isActive('/effectifs')}>Effectifs</Link>
          <Link to="/rapports" className={isActive('/rapports')}>Rapports</Link>
          <Link to="/pds" className={isActive('/pds')}>PDS</Link>
          <Link to="/interdits" className={isActive('/interdits')}>Interdits</Link>
          <Link to="/sanctions" className={isActive('/sanctions')}>⚖️ Sanctions</Link>
          <Link to="/medical" className={isActive('/medical')}>Médical</Link>
          <Link to="/dossiers" className={isActive('/dossiers')}>Dossiers</Link>
          <Link to="/telegrammes" className={isActive('/telegrammes')} style={{ position: 'relative' }}>
            ⚡ Télégrammes
            {unreadTel > 0 && <span style={{ position: 'absolute', top: -4, right: -8, background: '#e74c3c', color: 'white', fontSize: '0.55rem', fontWeight: 700, borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadTel}</span>}
          </Link>
          <Link to="/documentation" className={isActive('/documentation')}>Docs</Link>
          <Link to="/search" className={isActive('/search')}>Recherche</Link>
          {user?.isAdmin && (
            <Link to="/admin/users" className={isActive('/admin')}>Admin</Link>
          )}
        </nav>

        <div className="topbar-user">
          {user?.isGuest ? (
            <>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>👁️ Mode invité</span>
              <Link to="/" className="btn btn-small btn-primary" onClick={logout}>Se connecter</Link>
            </>
          ) : (
            <>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {user?.unite || ''} — {user?.username || ''}
              </span>
              <button className="btn btn-small btn-secondary" onClick={logout}>
                Déconnexion
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
