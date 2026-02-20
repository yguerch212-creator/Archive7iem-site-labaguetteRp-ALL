import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'

const ALL_GROUPS = [
  { name: 'Administration', icon: '👑', color: '#e74c3c', desc: 'Accès total au site' },
  { name: 'Administratif', icon: '📋', color: '#3498db', desc: 'Gère les effectifs, PDS, comptes' },
  { name: 'Officier', icon: '⭐', color: '#f39c12', desc: 'Valide docs, crée dossiers, interdits' },
  { name: 'Sous-officier', icon: '🎖️', color: '#27ae60', desc: 'Soumet docs, accès sous-off' },
  { name: 'Feldgendarmerie', icon: '🛡️', color: '#8e44ad', desc: 'Interdits de front, casier' },
  { name: 'Sanitaets', icon: '🏥', color: '#1abc9c', desc: 'Visites médicales, fiches patients' },
  { name: 'Etat-Major', icon: '⭐', color: '#f39c12', desc: 'État-major — équivalent admin' },
]

export default function AdminUsers() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [effectifsSansCompte, setEffectifsSansCompte] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ effectif_id: '', password: '' })
  const [message, setMessage] = useState(null)
  const [selected, setSelected] = useState(null)
  const [selectedGroups, setSelectedGroups] = useState([])
  const [search, setSearch] = useState('')
  const [pwdRequests, setPwdRequests] = useState([])

  useEffect(() => { fetchAll(); fetchPwdRequests() }, [])

  const fetchPwdRequests = async () => {
    try {
      const res = await api.get('/admin/password-requests')
      if (res.data.success) setPwdRequests(res.data.data.filter(r => !r.read_at && r.read_at !== 1))
    } catch {}
  }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [usersRes, effRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/effectifs-sans-compte')
      ])
      if (usersRes.data.success) setUsers(usersRes.data.data)
      if (effRes.data.success) setEffectifsSansCompte(effRes.data.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const flash = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 3000) }

  const openUser = async (u) => {
    setSelected(u)
    try {
      const res = await api.get(`/admin/users/${u.id}/groups`)
      setSelectedGroups(res.data.data || [])
    } catch { setSelectedGroups([]) }
  }

  const toggleGroup = async (groupName) => {
    const has = selectedGroups.includes(groupName)
    try {
      await api.put(`/admin/users/${selected.id}/group`, { action: has ? 'remove' : 'add', group: groupName })
      setSelectedGroups(prev => has ? prev.filter(g => g !== groupName) : [...prev, groupName])
      fetchAll()
      flash('success', has ? `${groupName} retiré` : `${groupName} accordé`)
    } catch { flash('error', 'Erreur') }
  }

  const toggleActive = async () => {
    try {
      await api.put(`/admin/users/${selected.id}/toggle-active`)
      setSelected(prev => ({ ...prev, active: !prev.active }))
      fetchAll()
    } catch { flash('error', 'Erreur') }
  }

  const deleteUser = async () => {
    if (!confirm(`Supprimer définitivement le compte de ${selected.prenom} ${selected.nom} ?`)) return
    try {
      await api.delete(`/admin/users/${selected.id}`)
      setSelected(null)
      fetchAll()
      flash('success', 'Compte supprimé')
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur') }
  }

  const createUser = async (e) => {
    e.preventDefault()
    if (!createForm.effectif_id) return
    try {
      const { data } = await api.post('/admin/users', createForm)
      if (data.success) {
        flash('success', data.message)
        setShowCreate(false)
        setCreateForm({ effectif_id: '', password: '' })
        fetchAll()
      } else { flash('error', data.message) }
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur') }
  }

  const canManage = user?.isAdmin || user?.isOfficier || user?.isRecenseur || user?.isEtatMajor
  if (!canManage) return <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>🚫 Accès refusé</div>

  const filtered = users.filter(u => {
    if (!search) return true
    return `${u.prenom} ${u.nom} ${u.username}`.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <BackButton label="← Tableau de bord" />
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <Link to="/admin/logs" className="btn btn-secondary btn-small">📊 Logs</Link>
          <Link to="/admin/stats" className="btn btn-secondary btn-small">📈 Stats</Link>
          <button className="btn btn-primary btn-small" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✕' : '+ Ajouter'}
          </button>
        </div>
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>⚙️ Administration</h1>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {/* Pending password reset requests */}
      {pwdRequests.length > 0 && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', borderLeft: '3px solid #e74c3c' }}>
          <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: '0.95rem' }}>🔑 Demandes de réinitialisation de mot de passe ({pwdRequests.length})</h3>
          {pwdRequests.map(r => (
            <div key={r.id} style={{ padding: 'var(--space-sm)', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', whiteSpace: 'pre-line' }}>
              {r.content}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {new Date(r.created_at).toLocaleString('fr-FR')}
                <button className="btn btn-secondary btn-small" style={{ marginLeft: 8, fontSize: '0.7rem', padding: '1px 6px' }} onClick={async () => {
                  await api.put(`/admin/notifications/${r.id}/read`).catch(() => {})
                  setPwdRequests(prev => prev.filter(p => p.id !== r.id))
                }}>✓ Traité</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>Créer un compte</h3>
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

      {/* Search */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-lg)' }}>
        <input className="form-input" style={{ maxWidth: 300 }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* User list */}
      {loading ? (
        <div className="paper-card" style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div>
      ) : (
        <div className="paper-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={th}>Utilisateur</th>
                <th style={th}>Grade / Unité</th>
                <th style={th}>Rôles</th>
                <th style={th}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}
                  onClick={() => u.id !== user.id && openUser(u)}
                  style={{ borderBottom: '1px solid var(--border-color)', cursor: u.id !== user.id ? 'pointer' : 'default', transition: 'background 0.15s' }}
                  onMouseEnter={ev => { if (u.id !== user.id) ev.currentTarget.style.background = 'var(--military-light)' }}
                  onMouseLeave={ev => ev.currentTarget.style.background = ''}
                >
                  <td style={td}>
                    <strong>{u.prenom} {u.nom}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{u.username}</div>
                  </td>
                  <td style={td}>
                    {u.grade_nom || '—'}
                    {u.unite_nom && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.unite_nom}</div>}
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {u.is_admin && <span style={badge('#e74c3c')}>👑 Admin</span>}
                      {u.is_recenseur && <span style={badge('#3498db')}>📋 Administratif</span>}
                      {u.is_officier && <span style={badge('#f39c12')}>⭐ Officier</span>}
                      {u.is_sousofficier && <span style={badge('#27ae60')}>🎖️ Sous-off</span>}
                      {u.is_feldgendarmerie && <span style={badge('#8e44ad')}>🛡️ Feld</span>}
                      {u.is_sanitaets && <span style={badge('#1abc9c')}>🏥 Sanit.</span>}
                      {u.is_etatmajor && <span style={badge('#f39c12')}>⭐ É-M</span>}
                      {!u.is_admin && !u.is_recenseur && !u.is_officier && !u.is_sousofficier && !u.is_feldgendarmerie && !u.is_sanitaets && !u.is_etatmajor && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aucun rôle</span>}
                    </div>
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: '0.8rem', color: u.active ? 'var(--success)' : 'var(--danger)' }}>
                      {u.active ? '🟢' : '🔴'}
                    </span>
                    {u.id === user.id && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 6 }}>Vous</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Permission Modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={ev => ev.stopPropagation()} style={{ background: 'var(--paper-bg)', border: '2px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 'var(--space-xl)', maxWidth: 500, width: '90%', boxShadow: 'var(--shadow-heavy)', maxHeight: '90vh', overflow: 'auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-md)' }}>
              <h2 style={{ margin: '0 0 4px' }}>{selected.prenom} {selected.nom}</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{selected.username}</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>{selected.grade_nom || '—'} · {selected.unite_nom || '—'}</p>
            </div>

            {/* Permissions */}
            <h3 style={{ margin: '0 0 var(--space-md)', fontSize: '0.95rem' }}>🔑 Permissions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
              {ALL_GROUPS.map(g => {
                const has = selectedGroups.includes(g.name)
                const restrictedGroups = ['Administration', 'Etat-Major']
                const canToggle = user?.isAdmin || !restrictedGroups.includes(g.name)
                return (
                  <div key={g.name}
                    onClick={() => canToggle ? toggleGroup(g.name) : null}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                      padding: 'var(--space-sm) var(--space-md)',
                      border: `2px solid ${has ? g.color : 'var(--border-color)'}`,
                      borderRadius: 'var(--border-radius)',
                      cursor: canToggle ? 'pointer' : 'not-allowed',
                      background: has ? `${g.color}10` : '',
                      opacity: canToggle ? 1 : 0.5,
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '1.3rem' }}>{g.icon}</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '0.9rem', color: has ? g.color : 'var(--text-primary)' }}>{g.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{g.desc}</div>
                    </div>
                    <div style={{
                      width: 40, height: 22, borderRadius: 11,
                      background: has ? g.color : 'var(--border-color)',
                      position: 'relative', transition: 'background 0.2s'
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', background: 'white',
                        position: 'absolute', top: 2,
                        left: has ? 20 : 2, transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }}></div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Account actions */}
            <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: '0.95rem' }}>⚡ Compte</h3>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-lg)' }}>
              {user?.isAdmin && <button className="btn btn-secondary btn-small" onClick={toggleActive}>
                {selected.active ? '🔴 Désactiver' : '🟢 Activer'}
              </button>}
              <button className="btn btn-secondary btn-small" onClick={async () => {
                const newPwd = prompt(`Nouveau mot de passe pour ${selected.username} (min 6 car.) :`)
                if (!newPwd || newPwd.length < 6) { if (newPwd !== null) alert('Minimum 6 caractères'); return }
                try {
                  const res = await api.put(`/admin/users/${selected.id}/reset-password`, { new_password: newPwd })
                  flash('success', res.data.message || 'Mot de passe réinitialisé')
                } catch (err) { flash('error', err.response?.data?.message || 'Erreur') }
              }}>
                🔑 Réinitialiser MDP
              </button>
              {user?.isAdmin && <button className="btn btn-small" style={{ background: 'var(--danger)', color: 'white', border: 'none' }} onClick={deleteUser}>
                🗑️ Supprimer le compte
              </button>}
            </div>

            <div style={{ textAlign: 'center' }}>
              <button className="btn btn-secondary btn-small" onClick={() => setSelected(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const th = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)', whiteSpace: 'nowrap' }
const td = { padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'middle' }
const badge = (color) => ({ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, background: `${color}20`, color, fontWeight: 600, whiteSpace: 'nowrap' })
