import React from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import AppRouter from './router'
import Topbar from './components/layout/Topbar'
import './styles/units.css'

function AppLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const isLogin = location.pathname === '/login' || location.pathname === '/'
  const showTopbar = user && !isLogin

  return (
    <div className="app">
      {showTopbar && <Topbar />}
      <div style={showTopbar ? { marginTop: 'var(--space-xl)' } : {}}>
        <AppRouter />
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App