import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

function ProtectedRoute({ children }) {
  const { user, loading, loginAsGuest } = useAuth()
  const location = useLocation()

  // Auto-guest: if not logged in and arriving via a direct link (not /login), auto-enable guest mode
  useEffect(() => {
    if (!loading && !user && location.pathname !== '/login') {
      loginAsGuest()
    }
  }, [loading, user])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="paper-card">
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // Will be handled by useEffect above, show loading briefly
    return (
      <div className="loading-screen">
        <div className="paper-card">
          <p>Accès visiteur...</p>
        </div>
      </div>
    )
  }

  // Force password change on first login
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return children
}

export default ProtectedRoute
