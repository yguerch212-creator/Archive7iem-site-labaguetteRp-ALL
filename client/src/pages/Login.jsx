import React, { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login({ username, password })
    setLoading(false)
    if (result.success) {
      navigate(result.mustChangePassword ? '/change-password' : '/dashboard')
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-header">
          <h1>Archives 7e Armeekorps</h1>
          <p className="login-subtitle">Zugang nur für autorisiertes Personal</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nom d'utilisateur</label>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ex : Zussman"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button className="btn btn-primary btn-large" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="login-footer">
          Accès réservé aux personnels autorisés du 84e Corps d'Armée
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-md);
        }
        .login-box {
          background: var(--paper-bg);
          border: 2px solid var(--border-color);
          border-radius: var(--border-radius);
          box-shadow: var(--shadow-heavy);
          padding: var(--space-xxl);
          width: 100%;
          max-width: 420px;
        }
        .login-header {
          text-align: center;
          margin-bottom: var(--space-xl);
        }
        .login-header h1 {
          font-size: 1.5rem;
          margin-bottom: var(--space-xs);
        }
        .login-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-style: italic;
        }
        .login-error {
          background: rgba(139, 74, 71, 0.1);
          border: 1px solid var(--error);
          color: var(--error);
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--border-radius);
          margin-bottom: var(--space-lg);
          text-align: center;
          font-size: 0.85rem;
        }
        .login-footer {
          margin-top: var(--space-xl);
          text-align: center;
          font-size: 0.7rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}
