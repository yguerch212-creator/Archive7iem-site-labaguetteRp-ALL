import React, { useEffect } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from './useAuth'

function ProtectedRoute({ children }) {
  const { user, loading, loginAsGuest } = useAuth()
  const location = useLocation()
  const [params] = useSearchParams()
  const isShare = params.has('share')

  useEffect(() => {
    // Auto-login as guest for shared links
    if (!loading && !user && isShare) {
      loginAsGuest()
    }
  }, [loading, user, isShare])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="paper-card"><p>Chargement...</p></div>
      </div>
    )
  }

  // Wait for guest auto-login to complete
  if (!user && isShare) {
    return (
      <div className="loading-screen">
        <div className="paper-card"><p>Chargement...</p></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return children
}

export default ProtectedRoute
