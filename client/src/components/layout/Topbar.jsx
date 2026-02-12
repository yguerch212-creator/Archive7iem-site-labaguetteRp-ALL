import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

function Topbar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const handleLogout = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      await logout()
    }
  }

  return (
    <div className="topbar">
      <div className="container">
        <div className="topbar-content">
          <div className="topbar-logo">
            <Link to="/dashboard">
              Archives Wehrmacht RP
            </Link>
          </div>

          <nav>
            <ul className="topbar-nav">
              <li>
                <Link 
                  to="/dashboard" 
                  className={isActive('/dashboard') ? 'active' : ''}
                >
                  Tableau de bord
                </Link>
              </li>
              <li>
                <Link 
                  to="/effectifs" 
                  className={isActive('/effectifs') ? 'active' : ''}
                >
                  Effectifs
                </Link>
              </li>
              <li>
                <Link 
                  to="/rapports" 
                  className={isActive('/rapports') ? 'active' : ''}
                >
                  Rapports
                </Link>
              </li>
              <li>
                <Link 
                  to="/casiers" 
                  className={isActive('/casiers') ? 'active' : ''}
                >
                  Casiers
                </Link>
              </li>
              {user?.isAdmin && (
                <li>
                  <Link 
                    to="/admin" 
                    className={isActive('/admin') ? 'active' : ''}
                  >
                    Administration
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          <div className="topbar-user">
            <div className="text-right">
              <div className="text-sm font-semibold">{user?.username}</div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                {user?.unite || 'Sans affectation'}
              </div>
            </div>
            
            <div className="flex gap-sm">
              <Link to="/profile" className="btn btn-small btn-secondary">
                Profil
              </Link>
              <button 
                onClick={handleLogout}
                className="btn btn-small btn-secondary"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Topbar