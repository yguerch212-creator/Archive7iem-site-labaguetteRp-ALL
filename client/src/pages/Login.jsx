import React, { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api/client'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotForm, setForgotForm] = useState({ username: '', discord_id: '', message: '' })
  const [forgotMsg, setForgotMsg] = useState(null)
  const [forgotLoading, setForgotLoading] = useState(false)
  const { login, loginAsGuest } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login({ username, password })
    setLoading(false)
    if (result.success) {
      navigate(result.mustChangePassword ? '/change-password' : redirectTo)
    } else {
      setError(result.error)
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    if (!forgotForm.username || !forgotForm.discord_id) {
      setForgotMsg({ type: 'error', text: 'Nom d\'utilisateur et Discord ID requis' })
      return
    }
    setForgotLoading(true)
    try {
      await api.post('/auth/forgot-password', forgotForm)
      setForgotMsg({ type: 'success', text: '✅ Demande envoyée ! Un administrateur va réinitialiser votre mot de passe.' })
    } catch (err) {
      setForgotMsg({ type: 'error', text: err.response?.data?.message || 'Erreur lors de l\'envoi' })
    }
    setForgotLoading(false)
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

        <div style={{ textAlign: 'center', margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-secondary" style={{ opacity: 0.7, fontSize: '0.8rem' }}
            onClick={() => { loginAsGuest(); navigate(redirectTo) }}>
            👁️ Accès invité (lecture seule)
          </button>
          <button style={{ background: 'none', border: 'none', color: 'var(--military-green)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => { setShowForgot(!showForgot); setForgotMsg(null) }}>
            {showForgot ? '← Retour à la connexion' : '🔑 Mot de passe oublié ?'}
          </button>
        </div>

        {showForgot && (
          <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', background: 'rgba(161,124,71,0.05)' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: 'var(--space-sm)' }}>🔑 Réinitialisation du mot de passe</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
              Remplissez ce formulaire. Un administrateur recevra votre demande et réinitialisera votre mot de passe.
            </p>
            {forgotMsg && <div className={`login-error`} style={{ background: forgotMsg.type === 'success' ? 'rgba(46,125,50,0.1)' : undefined, borderColor: forgotMsg.type === 'success' ? '#2e7d32' : undefined, color: forgotMsg.type === 'success' ? '#2e7d32' : undefined }}>{forgotMsg.text}</div>}
            <form onSubmit={handleForgotSubmit}>
              <div className="form-group">
                <label className="form-label">Nom d'utilisateur *</label>
                <input className="form-input" type="text" value={forgotForm.username} onChange={e => setForgotForm(p => ({...p, username: e.target.value}))} placeholder="Ex : siegfried.zussman" required />
              </div>
              <div className="form-group">
                <label className="form-label">Discord ID ou pseudo Discord *</label>
                <input className="form-input" type="text" value={forgotForm.discord_id} onChange={e => setForgotForm(p => ({...p, discord_id: e.target.value}))} placeholder="Ex : thomaslewis5395 ou 385861981833396225" required />
              </div>
              <div className="form-group">
                <label className="form-label">Message (optionnel)</label>
                <textarea className="form-input" rows={2} value={forgotForm.message} onChange={e => setForgotForm(p => ({...p, message: e.target.value}))} placeholder="Infos supplémentaires..." />
              </div>
              <button className="btn btn-primary" type="submit" disabled={forgotLoading} style={{ width: '100%' }}>
                {forgotLoading ? 'Envoi...' : '📨 Envoyer la demande'}
              </button>
            </form>
          </div>
        )}

        <div className="login-footer">
          Accès réservé aux personnels autorisés du 7e Armeekorps<br/>
          <span style={{ fontSize: '0.65rem', fontStyle: 'italic', marginTop: 4, display: 'block' }}>
            Ce site est dédié exclusivement à la simulation RP (jeu de rôle) sur Garry's Mod.<br/>
            Aucune affiliation avec des mouvements historiques ou politiques.
          </span>
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
