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
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const flash = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 3000) }

  const toggleGroup = async (userId, group, currentlyActive) => {
    try {
      await apiClient.put(`/admin/users/${userId}/group`, { action: currentlyActive ? 'remove' : 'add', group })
      fetchAll()
      flash('success', currentlyActive ? `${group} retiré` : `${group} accordé`)
    } catch { flash('error', 'Erreur') }
  }

  const createUser = async (e) => {
    e.preventDefault()
    if (!createForm.effectif_id) return
    try {
      const { data } = await apiClient.post('/admin/users', createForm)
      if (data.success) {
        flash('success', data.message)
        setShowCreate(false)
        setCreateForm({ effectif_id: '', password: '' })
        fetchAll()
      } else { flash('error', data.message) }
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur') }
  }

  if (!user?.isAdmin) {
    return <div className="container" style={{ textAlign: 'center', padding: '3rem' }}><p>🚫 Accès refusé</p></div>
  }

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <BackButton label="← Tableau de bord" />
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <Link to="/admin/logs" className="btn btn-secondary btn-small">📊 Logs</Link>
          <Link to="/admin/stats" className="btn btn-secondary btn-small">📈 Stats</Link>
          <button className="btn btn-primary btn-small" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✕ Annuler' : '+ Créer un compte'}
          </button>
        </div>
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>⚙️ Gestion des utilisateurs</h1>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {showCreate && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>Créer un compte depuis un effectif</h3>
          <form onSubmit={createUser}>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
                <label className="form-label">Effectif</label>
                <select className="form-input" value={createForm.effectif_id} onChange={e => setCreateForm(p => ({ ...p, effectif_id: e.target.value }))} required>
                  <option value="">— Sélectionner —</option>
                  {effectifsSansCompte.map(e => (
                    <option key={e.id} value={e.id}>{e.grade_nom ? `${e.grade_nom} ` : ''}{e.prenom} {e.nom} — {e.unite_nom}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Mot de passe</label>
                <input type="text" className="form-input" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} placeholder="Auto-généré" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--space-sm)' }}>Créer</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="paper-card" style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div>
      ) : (
        <div className="paper-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={th}>Utilisateur</th>
                <th style={th}>Grade / Unité</th>
                <th style={th} colSpan={3}>Permissions</th>
                <th style={th}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={td}>
                    <strong>{u.prenom} {u.nom}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{u.username}</div>
                  </td>
                  <td style={td}>
                    {u.grade_nom || '—'}
                    {u.unite_nom && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.unite_nom}</div>}
                  </td>
                  {/* Permission toggles */}
                  <td style={{ ...td, textAlign: 'center' }}>
                    {u.id !== user.id ? (
                      <button
                        onClick={() => toggleGroup(u.id, 'Administration', u.is_admin)}
                        style={{ background: 'none', border: `2px solid ${u.is_admin ? 'var(--success)' : 'var(--border-color)'}`, borderRadius: 'var(--border-radius)', padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: u.is_admin ? 'var(--success)' : 'var(--text-muted)', fontWeight: u.is_admin ? 700 : 400 }}
                      >
                        {u.is_admin ? '✅ Admin' : 'Admin'}
                      </button>
                    ) : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vous</span>}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {u.id !== user.id && (
                      <button
                        onClick={() => toggleGroup(u.id, 'Recenseur', u.is_recenseur)}
                        style={{ background: 'none', border: `2px solid ${u.is_recenseur ? 'var(--success)' : 'var(--border-color)'}`, borderRadius: 'var(--border-radius)', padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: u.is_recenseur ? 'var(--success)' : 'var(--text-muted)', fontWeight: u.is_recenseur ? 700 : 400 }}
                      >
                        {u.is_recenseur ? '✅ Recenseur' : 'Recenseur'}
                      </button>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {u.id !== user.id && (
                      <button
                        onClick={() => toggleGroup(u.id, 'Officier', u.is_officier)}
                        style={{ background: 'none', border: `2px solid ${u.is_officier ? 'var(--warning)' : 'var(--border-color)'}`, borderRadius: 'var(--border-radius)', padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: u.is_officier ? 'var(--warning)' : 'var(--text-muted)', fontWeight: u.is_officier ? 700 : 400 }}
                      >
                        {u.is_officier ? '⭐ Officier' : 'Officier'}
                      </button>
                    )}
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: '0.8rem', color: u.active ? 'var(--success)' : 'var(--danger)' }}>
                      {u.active ? '🟢 Actif' : '🔴 Inactif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const th = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)', whiteSpace: 'nowrap' }
const td = { padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'middle' }
