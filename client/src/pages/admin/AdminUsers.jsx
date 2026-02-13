import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import apiClient from '../../api/client'

export default function AdminUsers() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [effectifsSansCompte, setEffectifsSansCompte] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ effectif_id: '', password: '' })
  const [message, setMessage] = useState(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [usersRes, effRes] = await Promise.all([
        apiClient.get('/admin/users'),
        apiClient.get('/admin/effectifs-sans-compte')
      ])
      if (usersRes.data.success) setUsers(usersRes.data.data)
      if (effRes.data.success) setEffectifsSansCompte(effRes.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleGroup = async (userId, group, currentlyActive) => {
    try {
      await apiClient.put(`/admin/users/${userId}/group`, { action: currentlyActive ? 'remove' : 'add', group })
      fetchAll()
      const label = group === 'Administration' ? 'admin' : 'recenseur'
      setMessage({ type: 'success', text: currentlyActive ? `Droits ${label} retirés` : `Droits ${label} accordés` })
    } catch {
      setMessage({ type: 'error', text: 'Erreur' })
    }
  }

  const toggleAdmin = (userId, current) => toggleGroup(userId, 'Administration', current)
  const toggleRecenseur = (userId, current) => toggleGroup(userId, 'Recenseur', current)

  const createUser = async (e) => {
    e.preventDefault()
    if (!createForm.effectif_id) return
    try {
      const { data } = await apiClient.post('/admin/users', createForm)
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        setShowCreate(false)
        setCreateForm({ effectif_id: '', password: '' })
        fetchAll()
      } else {
        setMessage({ type: 'error', text: data.message })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur serveur' })
    }
  }

  if (!user?.isAdmin) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '3rem' }}>🚫</p>
          <p>Accès refusé — Droits administrateur requis</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <BackButton label="← Tableau de bord" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>⚙️ Gestion des utilisateurs</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✕ Annuler' : '+ Créer un compte'}
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1rem' }}>
          {message.text}
          <button onClick={() => setMessage(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {showCreate && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3>Créer un compte depuis un effectif</h3>
          <form onSubmit={createUser}>
            <div className="form-group">
              <label className="form-label">Effectif (sans compte)</label>
              <select
                className="form-input"
                value={createForm.effectif_id}
                onChange={e => setCreateForm(p => ({ ...p, effectif_id: e.target.value }))}
                required
              >
                <option value="">— Sélectionner —</option>
                {effectifsSansCompte.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.grade_nom ? `${e.grade_nom} ` : ''}{e.prenom} {e.nom} — {e.unite_nom}
                  </option>
                ))}
              </select>
              {effectifsSansCompte.length === 0 && (
                <small className="text-muted">Tous les effectifs ont déjà un compte.</small>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe (défaut: Wehrmacht123)</label>
              <input
                type="text"
                className="form-input"
                value={createForm.password}
                onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Wehrmacht123"
              />
            </div>
            <button type="submit" className="btn btn-primary">Créer le compte</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom</th>
                <th>Username</th>
                <th>Grade</th>
                <th>Unité</th>
                <th>Admin</th>
                <th>Recenseur</th>
                <th>Actif</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td><strong>{u.prenom} {u.nom}</strong></td>
                  <td><code>{u.username}</code></td>
                  <td>{u.grade_nom || '—'}</td>
                  <td>{u.unite_nom || '—'}</td>
                  <td>
                    <span className={`badge ${u.is_admin ? 'badge-success' : 'badge-muted'}`}>
                      {u.is_admin ? '✅ Admin' : '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_recenseur ? 'badge-info' : 'badge-muted'}`}>
                      {u.is_recenseur ? '📋 Recenseur' : '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.active ? 'badge-success' : 'badge-danger'}`}>
                      {u.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {u.id !== user.id && (
                      <>
                        <button
                          className="btn btn-sm"
                          onClick={() => toggleAdmin(u.id, u.is_admin)}
                        >
                          {u.is_admin ? '🔓 Retirer admin' : '🔒 Admin'}
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => toggleRecenseur(u.id, u.is_recenseur)}
                        >
                          {u.is_recenseur ? '📋 Retirer recenseur' : '📋 Recenseur'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ marginTop: '2rem', padding: '1rem' }}>
        <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
          📌 Les comptes sont créés depuis les effectifs existants. Le username est généré automatiquement (prénom.nom).
          Le mot de passe par défaut est <code>Wehrmacht123</code> — l'utilisateur devra le changer à sa première connexion.
        </p>
      </div>
    </div>
  )
}
