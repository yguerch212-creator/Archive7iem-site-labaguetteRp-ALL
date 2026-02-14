import React, { useEffect, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

function ProtectedRoute({ children }) {
  const { user, loading, loginAsGuest } = useAuth()
  const location = useLocation()
  const guestTriggered = useRef(false)

  // Auto-guest: if not logged in, enable guest mode (only trigger once)
  useEffect(() => {
    if (!loading && !user && !guestTriggered.current) {
      guestTriggered.current = true
      loginAsGuest()
    }
  }, [loading, user])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="paper-card"><p>Chargement...</p></div>
      </div>
    )
  }

  // Waiting for guest login to take effect
  if (!user) {
    return (
      <div className="loading-screen">
        <div className="paper-card"><p>Accès visiteur...</p></div>
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
