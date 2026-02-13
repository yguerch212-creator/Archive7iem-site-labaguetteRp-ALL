import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'

export default function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPass !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (newPass.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères'); return }
    try {
      await apiClient.put('/auth/change-password', { currentPassword: current, newPassword: newPass })
      setSuccess('Mot de passe modifié avec succès')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur')
    }
  }

  return (
    <>
      
      <div className="container" style={{ maxWidth: 500, marginTop: 'var(--space-xxl)' }}>
        <div className="paper-card">
          <h2>Changer le mot de passe</h2>
          {error && <div style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</div>}
          {success && <div style={{ color: 'var(--success)', marginBottom: '1rem' }}>{success}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Mot de passe actuel</label>
              <input className="form-input" type="password" value={current} onChange={e => setCurrent(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Nouveau mot de passe</label>
              <input className="form-input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmer</label>
              <input className="form-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit">Modifier</button>
          </form>
        </div>
      </div>
    </>
  )
}
