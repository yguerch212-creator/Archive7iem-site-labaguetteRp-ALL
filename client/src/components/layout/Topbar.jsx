import React, { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'

export default function Topbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [unreadTel, setUnreadTel] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [incidentsCount, setIncidentsCount] = useState(0)
  const [showNotif, setShowNotif] = useState(false)

  // Polling notifications every 30s
  const fetchNotifications = useCallback(() => {
    if (!user || user.isGuest) return
    if (user.effectif_id) {
      api.get('/telegrammes', { params: { tab: 'recu' } })
        .then(r => setUnreadTel(r.data.unread || 0)).catch(() => {})
    }
    if (user.isAdmin || user.isOfficier || user.isRecenseur || user.isFeldgendarmerie) {
      api.get('/stats/pending')
        .then(r => { setPendingCount(r.data?.total || 0); setIncidentsCount(r.data?.incidents || 0) }).catch(() => {})
    }
  }, [user])

  useEffect(() => { fetchNotifications() }, [location.pathname])
  useEffect(() => {
    const iv = setInterval(fetchNotifications, 30000)
    return () => clearInterval(iv)
  }, [fetchNotifications])

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
              {/* Notification bell */}
              {(pendingCount > 0 || unreadTel > 0) && (
                <div style={{ position: 'relative', cursor: 'pointer', fontSize: '1.1rem' }} onClick={() => setShowNotif(!showNotif)} title="Notifications">
                  🔔
                  <span style={{ position: 'absolute', top: -6, right: -8, background: '#e74c3c', color: '#fff', fontSize: '0.55rem', fontWeight: 700, borderRadius: '50%', minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px' }}>{pendingCount + unreadTel}</span>
                  {showNotif && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, background: '#faf8f2', border: '1px solid var(--border-color)', borderRadius: 6, padding: 'var(--space-sm)', minWidth: 200, zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
                      {unreadTel > 0 && <div style={{ padding: '6px 8px', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => { navigate('/telegrammes'); setShowNotif(false) }}>⚡ {unreadTel} télégramme(s) non lu(s)</div>}
                      {incidentsCount > 0 && <div style={{ padding: '6px 8px', fontSize: '0.8rem', cursor: 'pointer', color: '#e65100' }} onClick={() => { navigate('/rapports'); setShowNotif(false) }}>⚠️ {incidentsCount} incident(s) à traiter</div>}
                      {pendingCount - incidentsCount > 0 && <div style={{ padding: '6px 8px', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => { navigate('/rapports'); setShowNotif(false) }}>📝 {pendingCount - incidentsCount} élément(s) en attente</div>}
                    </div>
                  )}
                </div>
              )}
              {/* Profile icon → dossier personnel */}
              {user?.effectif_id && (
                <Link to={`/dossiers/effectif/${user.effectif_id}`} title="Mon dossier personnel" style={{ fontSize: '1.1rem', textDecoration: 'none', lineHeight: 1 }}>👤</Link>
              )}
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
