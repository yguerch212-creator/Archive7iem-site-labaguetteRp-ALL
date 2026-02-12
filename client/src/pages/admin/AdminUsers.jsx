import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import Topbar from '../../components/layout/Topbar'

export default function AdminUsers() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [effectifs, setEffectifs] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [newUser, setNewUser] = useState({ effectif_id: '', password: 'Wehrmacht123' })

  useEffect(() => {
    if (!user?.isAdmin) return
    loadData()
  }, [])

  const loadData = () => {
    apiClient.get('/admin/users').then(r => setUsers(r.data.data || []))
    apiClient.get('/admin/effectifs-sans-compte').then(r => setEffectifs(r.data.data || [])).catch(() => {})
  }

  const createUser = async (e) => {
    e.preventDefault()
    setError(''); setMessage('')
    try {
      const res = await apiClient.post('/admin/users', newUser)
      setMessage(res.data.message)
      setNewUser({ effectif_id: '', password: 'Wehrmacht123' })
      loadData()
    } catch (err) { setError(err.response?.data?.message || 'Erreur') }
  }

  const toggleAdmin = async (uid, isAdmin) => {
    try {
      await apiClient.put(`/admin/users/${uid}/group`, { action: isAdmin ? 'remove' : 'add' })
      loadData()
    } catch (err) { alert('Erreur') }
  }

  if (!user?.isAdmin) return <><Topbar /><div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Accès refusé</div></>

  return (
    <>
      <Topbar />
      <div className="container" style={{ maxWidth: 1000, marginTop: 'var(--space-xl)' }}>
        <Link to="/dashboard" className="btn btn-secondary btn-small">← Retour</Link>
        <h1 style={{ textAlign: 'center' }}>⚙️ Administration</h1>

        {/* Création de compte */}
        <div className="paper-card">
          <h3>Créer un compte depuis un effectif</h3>
          {message && <div style={{ color: 'var(--success)', marginBottom: '1rem' }}>{message}</div>}
          {error && <div style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</div>}
          <form onSubmit={createUser} style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Effectif</label>
              <select className="form-select" value={newUser.effectif_id} onChange={e => setNewUser(n => ({ ...n, effectif_id: e.target.value }))} required>
                <option value="">— Choisir —</option>
                {effectifs.map(ef => <option key={ef.id} value={ef.id}>{ef.grade_nom} {ef.prenom} {ef.nom} — {ef.unite_nom}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Mot de passe</label>
              <input className="form-input" value={newUser.password} onChange={e => setNewUser(n => ({ ...n, password: e.target.value }))} />
            </div>
            <button className="btn btn-primary" type="submit">Créer</button>
          </form>
        </div>

        {/* Liste users */}
        <div className="paper-card" style={{ overflow: 'auto' }}>
          <h3>Utilisateurs ({users.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={th}>Nom</th>
                <th style={th}>Grade</th>
                <th style={th}>Unité</th>
                <th style={th}>Niveau</th>
                <th style={th}>Admin</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={td}>{u.prenom} {u.nom}</td>
                  <td style={td}>{u.grade_nom || '—'}</td>
                  <td style={td}>{u.unite_nom || '—'}</td>
                  <td style={td}>{u.role_level}</td>
                  <td style={td}>{u.is_admin ? <span className="tag tag-success">Admin</span> : '—'}</td>
                  <td style={td}>
                    <button className="btn btn-small btn-secondary" onClick={() => toggleAdmin(u.id, u.is_admin)}>
                      {u.is_admin ? 'Retirer admin' : 'Rendre admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

const th = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700 }
const td = { padding: 'var(--space-sm) var(--space-md)' }
