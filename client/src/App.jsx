import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import AppRouter from './router'
import './styles/units.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <AppRouter />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App