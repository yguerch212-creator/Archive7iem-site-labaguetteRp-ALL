import React, { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import PaperCard from '../components/layout/PaperCard'

function Login() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { login } = useAuth()

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!credentials.username || !credentials.password) {
      setError('Veuillez remplir tous les champs')
      return
    }

    setLoading(true)
    try {
      const result = await login(credentials)
      if (!result.success) {
        setError(result.error)
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="flex items-center justify-center" style={{ minHeight: '100vh', padding: '2rem 0' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <PaperCard>
            <div className="paper-card-header text-center">
              <h1 className="paper-card-title">Archives Wehrmacht RP</h1>
              <p className="paper-card-subtitle">7ème Division d'Infanterie</p>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Nom d'utilisateur
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={credentials.username}
                  onChange={handleChange}
                  className="form-input"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Mot de passe
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  className="form-input"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="form-error mb-0" style={{ marginBottom: '1rem' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-sm">
                    <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                    Connexion...
                  </div>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>
          </PaperCard>
        </div>
      </div>
    </div>
  )
}

export default Login