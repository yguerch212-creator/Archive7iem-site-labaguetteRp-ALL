import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

export default function Topbar() {
  const { user, logout } = useAuth()
  const location = useLocation()

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
          <Link to="/search" className={isActive('/search')}>Recherche</Link>
          {user?.isAdmin && (
            <Link to="/admin/users" className={isActive('/admin')}>Admin</Link>
          )}
        </nav>

        <div className="topbar-user">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {user?.unite || ''} — {user?.username || ''}
          </span>
          <button className="btn btn-small btn-secondary" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  )
}
