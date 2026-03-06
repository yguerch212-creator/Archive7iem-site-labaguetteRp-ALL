import BackButton from '../../components/BackButton'
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'

/* ─── Icon map (no emoji in DB to avoid encoding issues) ─── */
const ROLE_ICONS = {
  'Administration': '👑', 'Etat-Major': '⭐', 'Officier': '🎖️',
  'Administratif': '📋', 'Feldgendarmerie': '🛡️', 'Sous-officier': '🪖',
  'Sanitaets': '🏥', 'Homme du rang': '👤'
}

const SALON_LABELS = {
  effectifs: '👥 Effectifs', rapports: '📄 Rapports', documentation: '📚 Documentation',
  journal: '📰 Journal', telegrammes: '📨 Télégrammes', medical: '🏥 Médical',
  sanctions: '⚖️ Sanctions', front: '🗺️ Front', pds: '⏰ PDS',
  commandement: '🎖️ Commandement', bibliotheque: '📖 Bibliothèque', organigramme: '🏛️ Organigramme',
  admin: '⚙️ Administration', dossiers: '📁 Dossiers', habillement: '👔 Habillement',
  solde: '💰 Solde', interdits: '🚫 Interdits', archives: '🗄️ Archives'
}

const PERM_LABELS = {
  view: 'Voir', create: 'Créer', edit: 'Modifier', edit_others: 'Mod. autres',
  delete: 'Supprimer', delete_others: 'Supp. autres', validate: 'Valider', sign: 'Signer', export: 'Exporter'
}

const GLOBAL_PERM_LABELS = {
  manage_roles: 'Gérer les rôles', manage_regiment_effectifs: 'Gérer effectifs (régiment)',
  manage_all_effectifs: 'Gérer tous les effectifs', view_logs: 'Voir les logs',
  manage_users: 'Gérer les utilisateurs', moderate: 'Modérer', manage_notifications: 'Notifications',
  bypass_validation: 'Contourner validations', administrator: '👑 Administrateur'
}

/* ─── Default salon permissions per system role ─── */
const DEFAULT_ROLE_SALONS = {
  'Administration': {}, // administrator bypass
  'Etat-Major': {
    effectifs: { view: 'allow', create: 'allow', edit: 'allow', edit_others: 'allow', delete: 'allow', validate: 'allow', sign: 'allow', export: 'allow' },
    rapports: { view: 'allow', create: 'allow', edit: 'allow', validate: 'allow', sign: 'allow', export: 'allow' },
    commandement: { view: 'allow', create: 'allow', edit: 'allow', validate: 'allow' },
    admin: { view: 'allow' }
  },
  'Officier': {
    effectifs: { view: 'allow', create: 'allow', edit: 'allow', export: 'allow' },
    rapports: { view: 'allow', create: 'allow', edit: 'allow', validate: 'allow', sign: 'allow', export: 'allow' },
    documentation: { view: 'allow', create: 'allow', edit: 'allow' },
    commandement: { view: 'allow' },
    interdits: { view: 'allow', create: 'allow' }
  },
  'Administratif': {
    effectifs: { view: 'allow', create: 'allow', edit: 'allow', edit_others: 'allow', export: 'allow' },
    rapports: { view: 'allow', create: 'allow', edit: 'allow', export: 'allow' },
    documentation: { view: 'allow', create: 'allow', edit: 'allow' },
    dossiers: { view: 'allow', create: 'allow', edit: 'allow' },
    habillement: { view: 'allow', create: 'allow', validate: 'allow' },
    admin: { view: 'allow' }
  },
  'Feldgendarmerie': {
    sanctions: { view: 'allow', create: 'allow', edit: 'allow', validate: 'allow' },
    interdits: { view: 'allow', create: 'allow', edit: 'allow' },
    rapports: { view: 'allow', create: 'allow', edit: 'allow' },
    effectifs: { view: 'allow' }
  },
  'Sous-officier': {
    effectifs: { view: 'allow' },
    rapports: { view: 'allow', create: 'allow', edit: 'allow' },
    pds: { view: 'allow', edit: 'allow' },
    documentation: { view: 'allow' },
    telegrammes: { view: 'allow', create: 'allow' }
  },
  'Sanitaets': {
    medical: { view: 'allow', create: 'allow', edit: 'allow', edit_others: 'allow', validate: 'allow', export: 'allow' },
    effectifs: { view: 'allow' },
    rapports: { view: 'allow', create: 'allow' }
  },
  'Homme du rang': {
    effectifs: { view: 'allow' },
    rapports: { view: 'allow' },
    pds: { view: 'allow', edit: 'allow' },
    documentation: { view: 'allow' },
    telegrammes: { view: 'allow' }
  }
}

export default function AdminUsers() {
  const { user } = useAuth()
  const [tab, setTab] = useState('users') // users | roles | regiment
  const [users, setUsers] = useState([])
  const [effectifsSansCompte, setEffectifsSansCompte] = useState([])
  const [roles, setRoles] = useState([])
  const [regimentEffectifs, setRegimentEffectifs] = useState([])
  const [transfers, setTransfers] = useState([])
  const [dismissals, setDismissals] = useState([])
  const [unites, setUnites] = useState([])
  const [salonsData, setSalonsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [search, setSearch] = useState('')

  // Modal states
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedUserGroups, setSelectedUserGroups] = useState([])
  const [selectedUserRoles, setSelectedUserRoles] = useState([])
  const [selectedRole, setSelectedRole] = useState(null)
  const [roleForm, setRoleForm] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ effectif_id: '', password: '' })
  const [regimentModal, setRegimentModal] = useState(null)
  const [motif, setMotif] = useState('')
  const [toUnite, setToUnite] = useState('')
  const [severity, setSeverity] = useState('simple')
  const [expandedSalons, setExpandedSalons] = useState({})
  const [regTab, setRegTab] = useState('effectifs')
  const [pwdRequests, setPwdRequests] = useState([])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [usersRes, effRes, rolesRes, salonsRes, unitesRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/effectifs-sans-compte'),
        api.get('/roles'),
        api.get('/roles/salons'),
        api.get('/unites')
      ])
      if (usersRes.data.success) setUsers(usersRes.data.data)
      if (effRes.data.success) setEffectifsSansCompte(effRes.data.data)
      if (rolesRes.data.success) setRoles(rolesRes.data.data)
      if (salonsRes.data.success) setSalonsData(salonsRes.data.data)
      if (unitesRes.data?.success !== false) setUnites(Array.isArray(unitesRes.data) ? unitesRes.data : unitesRes.data.data || [])

      // Fetch regiment data
      try {
        const [regRes, trRes, diRes] = await Promise.all([
          api.get('/regiment/effectifs'),
          api.get('/regiment/transfers').catch(() => ({ data: { data: [] } })),
          api.get('/regiment/dismissals').catch(() => ({ data: { data: [] } }))
        ])
        if (regRes.data.success) setRegimentEffectifs(regRes.data.data)
        setTransfers(trRes.data.data || [])
        setDismissals(diRes.data.data || [])
      } catch {}

      // Fetch pwd requests
      try {
        const pr = await api.get('/admin/password-requests')
        if (pr.data.success) setPwdRequests(pr.data.data.filter(r => !r.read_at && r.read_at !== 1))
      } catch {}
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const flash = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 4000) }

  /* ─── USER TAB HANDLERS ─── */
  const openUser = async (u) => {
    setSelectedUser(u)
    try {
      const [groupsRes, rolesRes] = await Promise.all([
        api.get(`/admin/users/${u.id}/groups`),
        api.get(`/roles/user/${u.id}/permissions`)
      ])
      setSelectedUserGroups(groupsRes.data.data || [])
      setSelectedUserRoles(rolesRes.data.data?.roles || [])
    } catch {
      setSelectedUserGroups([])
      setSelectedUserRoles([])
    }
  }

  const toggleUserRole = async (role) => {
    const has = selectedUserRoles.some(r => r.id === role.id)
    try {
      if (has) {
        await api.delete(`/roles/${role.id}/assign/${selectedUser.id}`)
      } else {
        await api.post(`/roles/${role.id}/assign/${selectedUser.id}`)
      }
      // Refresh
      const rolesRes = await api.get(`/roles/user/${selectedUser.id}/permissions`)
      setSelectedUserRoles(rolesRes.data.data?.roles || [])
      fetchAll()
      flash('success', has ? `${role.name} retiré` : `${role.name} attribué`)
    } catch (e) { flash('error', e.response?.data?.message || 'Erreur') }
  }

  const toggleActive = async () => {
    try {
      await api.put(`/admin/users/${selectedUser.id}/toggle-active`)
      setSelectedUser(prev => ({ ...prev, active: !prev.active }))
      fetchAll()
    } catch { flash('error', 'Erreur') }
  }

  const deleteUser = async () => {
    if (!confirm(`Supprimer définitivement le compte de ${selectedUser.prenom} ${selectedUser.nom} ?`)) return
    try {
      await api.delete(`/admin/users/${selectedUser.id}`)
      setSelectedUser(null)
      fetchAll()
      flash('success', 'Compte supprimé')
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur') }
  }

  const createUser = async (e) => {
    e.preventDefault()
    if (!createForm.effectif_id) return
    try {
      const { data } = await api.post('/admin/users', createForm)
      if (data.success) { flash('success', data.message); setShowCreate(false); setCreateForm({ effectif_id: '', password: '' }); fetchAll() }
      else flash('error', data.message)
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur') }
  }

  /* ─── ROLES TAB HANDLERS ─── */
  const openRole = async (role) => {
    try {
      const { data } = await api.get(`/roles/${role.id}`)
      if (data.success) { setSelectedRole(data.data); setRoleForm(null) }
    } catch { flash('error', 'Erreur chargement rôle') }
  }

  const startEditRole = (role) => {
    setRoleForm({
      name: role.name, color: role.color || '#8B4513', level: role.level,
      permissions_global: { ...(role.permissions_global || {}) },
      salon_permissions: { ...(role.salon_permissions || {}) }
    })
  }

  const startCreateRole = () => {
    setSelectedRole(null)
    setRoleForm({
      name: '', color: '#8B4513', level: 5,
      permissions_global: {}, salon_permissions: {}
    })
  }

  const toggleGlobalPerm = (perm) => {
    setRoleForm(p => ({ ...p, permissions_global: { ...p.permissions_global, [perm]: !p.permissions_global[perm] } }))
  }

  const cycleSalonPerm = (salon, perm) => {
    setRoleForm(prev => {
      const current = prev.salon_permissions[salon]?.[perm] || 'inherit'
      const next = current === 'inherit' ? 'allow' : current === 'allow' ? 'deny' : 'inherit'
      const sp = { ...prev.salon_permissions }
      if (!sp[salon]) sp[salon] = {}
      if (next === 'inherit') { delete sp[salon][perm]; if (!Object.keys(sp[salon]).length) delete sp[salon] }
      else sp[salon] = { ...sp[salon], [perm]: next }
      return { ...prev, salon_permissions: sp }
    })
  }

  const saveRole = async () => {
    try {
      if (selectedRole) {
        const { data } = await api.put(`/roles/${selectedRole.id}`, roleForm)
        if (data.success) { flash('success', 'Rôle modifié'); fetchAll(); openRole(selectedRole) }
        else flash('error', data.message)
      } else {
        const { data } = await api.post('/roles', roleForm)
        if (data.success) { flash('success', 'Rôle créé'); fetchAll(); setRoleForm(null) }
        else flash('error', data.message)
      }
    } catch (e) { flash('error', e.response?.data?.message || 'Erreur') }
  }

  const deleteRole = async () => {
    if (!selectedRole || selectedRole.is_system) return
    if (!confirm(`Supprimer le rôle "${selectedRole.name}" ?`)) return
    try {
      const { data } = await api.delete(`/roles/${selectedRole.id}`)
      if (data.success) { flash('success', 'Rôle supprimé'); setSelectedRole(null); setRoleForm(null); fetchAll() }
      else flash('error', data.message)
    } catch (e) { flash('error', e.response?.data?.message || 'Erreur') }
  }

  const applyDefaultPerms = async (role) => {
    const defaults = DEFAULT_ROLE_SALONS[role.name]
    if (!defaults) { flash('error', 'Pas de permissions par défaut pour ce rôle'); return }
    try {
      const { data } = await api.put(`/roles/${role.id}`, {
        name: role.name, color: role.color, level: role.level,
        permissions_global: role.permissions_global,
        salon_permissions: defaults
      })
      if (data.success) { flash('success', `Permissions par défaut appliquées à ${role.name}`); openRole(role); fetchAll() }
      else flash('error', data.message)
    } catch (e) { flash('error', e.response?.data?.message || 'Erreur') }
  }

  /* ─── REGIMENT TAB HANDLERS ─── */
  const submitTransfer = async () => {
    if (!toUnite || motif.length < 10) { flash('error', 'Unité et motif (min 10 car.) requis'); return }
    try {
      const { data } = await api.post('/regiment/transfer', { effectif_id: regimentModal.effectif.id, to_unite_id: parseInt(toUnite), motif })
      if (data.success) { flash('success', data.message); setRegimentModal(null); fetchAll() }
      else flash('error', data.message)
    } catch (e) { flash('error', e.response?.data?.message || 'Erreur') }
  }

  const submitDismiss = async () => {
    if (motif.length < 10) { flash('error', 'Motif requis (min 10 caractères)'); return }
    if (!confirm(`Confirmer le renvoi de ${regimentModal.effectif.prenom} ${regimentModal.effectif.nom} ?`)) return
    try {
      const { data } = await api.post('/regiment/dismiss', { effectif_id: regimentModal.effectif.id, motif, severity })
      if (data.success) { flash('success', data.message); setRegimentModal(null); fetchAll() }
      else flash('error', data.message)
    } catch (e) { flash('error', e.response?.data?.message || 'Erreur') }
  }

  const handleTransferAction = async (id, action) => {
    try {
      const { data } = await api.put(`/regiment/transfers/${id}`, { action })
      if (data.success) { flash('success', data.message); fetchAll() }
      else flash('error', data.message)
    } catch (e) { flash('error', e.response?.data?.message || 'Erreur') }
  }

  const reinstate = async (effectifId, name) => {
    if (!confirm(`Réintégrer ${name} ?`)) return
    try {
      const { data } = await api.post(`/regiment/reinstate/${effectifId}`)
      if (data.success) { flash('success', data.message); fetchAll() }
      else flash('error', data.message)
    } catch (e) { flash('error', e.response?.data?.message || 'Erreur') }
  }

  const canManage = user?.isAdmin || user?.isOfficier || user?.isRecenseur || user?.isEtatMajor
  if (!canManage) return <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>🚫 Accès refusé</div>

  const filteredUsers = users.filter(u => !search || `${u.prenom} ${u.nom} ${u.username}`.toLowerCase().includes(search.toLowerCase()))
  const filteredRegiment = regimentEffectifs.filter(e => !search || `${e.prenom} ${e.nom} ${e.grade_nom || ''} ${e.unite_nom || ''}`.toLowerCase().includes(search.toLowerCase()))
  const pendingTransfers = transfers.filter(t => t.status === 'pending')
  const systemRoles = roles.filter(r => r.is_system)
  const customRoles = roles.filter(r => !r.is_system)

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <BackButton label="← Tableau de bord" />
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <Link to="/admin/logs" className="btn btn-secondary btn-small">📊 Logs</Link>
          <Link to="/admin/stats" className="btn btn-secondary btn-small">📈 Stats</Link>
          <Link to="/admin/moderation" className="btn btn-secondary btn-small">✅ Modération</Link>
        </div>
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-sm)', fontSize: '1.4rem' }}>⚙️ Administration</h1>

      {message && <div className={`alert alert-${message.type}`} style={{ marginBottom: 'var(--space-md)' }}>{message.text}</div>}

      {/* Main tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 'var(--space-lg)', borderBottom: '2px solid var(--border-color)' }}>
        {[
          { id: 'users', label: '👥 Utilisateurs', count: users.length },
          { id: 'roles', label: '🔐 Rôles & Permissions', count: roles.length },
          { id: 'regiment', label: '🏛️ Régiment', count: regimentEffectifs.length, badge: pendingTransfers.length }
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); setSelectedUser(null); setSelectedRole(null); setRoleForm(null) }}
            style={{
              padding: '10px 20px', fontSize: '0.85rem', cursor: 'pointer',
              background: tab === t.id ? 'var(--military-dark)' : 'transparent',
              color: tab === t.id ? '#f5ecd7' : 'var(--text-primary)',
              border: 'none', borderBottom: tab === t.id ? '3px solid var(--military-green)' : '3px solid transparent',
              fontFamily: 'var(--font-mono)', fontWeight: tab === t.id ? 700 : 400,
              transition: 'all 0.15s', position: 'relative'
            }}>
            {t.label}
            <span style={{ fontSize: '0.7rem', marginLeft: 4, opacity: 0.7 }}>({t.count})</span>
            {t.badge > 0 && <span style={{ position: 'absolute', top: 4, right: 4, background: '#e74c3c', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Search bar (shared) */}
      {(tab === 'users' || tab === 'regiment') && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
          <input className="form-input" style={{ maxWidth: 300 }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          {tab === 'users' && <button className="btn btn-primary btn-small" onClick={() => setShowCreate(!showCreate)}>{showCreate ? '✕' : '+ Créer un compte'}</button>}
        </div>
      )}

      {loading ? <div className="paper-card" style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div> : (<>

        {/* ═══════════════ USERS TAB ═══════════════ */}
        {tab === 'users' && (<>
          {/* Pwd requests */}
          {pwdRequests.length > 0 && (
            <div className="paper-card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', borderLeft: '3px solid #e74c3c' }}>
              <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: '0.9rem' }}>🔑 Demandes MDP ({pwdRequests.length})</h3>
              {pwdRequests.map(r => (
                <div key={r.id} style={{ padding: 'var(--space-xs)', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', whiteSpace: 'pre-line' }}>
                  {r.content}
                  <button className="btn btn-secondary btn-small" style={{ marginLeft: 8, fontSize: '0.65rem', padding: '1px 5px' }} onClick={async () => {
                    await api.put(`/admin/notifications/${r.id}/read`).catch(() => {})
                    setPwdRequests(prev => prev.filter(p => p.id !== r.id))
                  }}>✓</button>
                </div>
              ))}
            </div>
          )}

          {/* Create form */}
          {showCreate && (
            <div className="paper-card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)' }}>
              <h3 style={{ marginTop: 0, fontSize: '0.95rem' }}>Créer un compte</h3>
              <form onSubmit={createUser} style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'end' }}>
                <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
                  <label className="form-label">Effectif</label>
                  <select className="form-input" value={createForm.effectif_id} onChange={e => setCreateForm(p => ({ ...p, effectif_id: e.target.value }))} required>
                    <option value="">— Sélectionner —</option>
                    {effectifsSansCompte.map(e => <option key={e.id} value={e.id}>{e.grade_nom ? `${e.grade_nom} ` : ''}{e.prenom} {e.nom} — {e.unite_nom}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Mot de passe</label>
                  <input type="text" className="form-input" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 8 car." />
                </div>
                <button type="submit" className="btn btn-primary btn-small">Créer</button>
              </form>
            </div>
          )}

          {/* Users table */}
          <div className="paper-card" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={th}>Utilisateur</th><th style={th}>Grade / Unité</th><th style={th}>Rôles</th><th style={th}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} onClick={() => u.id !== user.id && openUser(u)}
                    style={{ borderBottom: '1px solid var(--border-color)', cursor: u.id !== user.id ? 'pointer' : 'default', transition: 'background 0.12s' }}
                    onMouseEnter={ev => { if (u.id !== user.id) ev.currentTarget.style.background = 'var(--military-light)' }}
                    onMouseLeave={ev => ev.currentTarget.style.background = ''}>
                    <td style={td}><strong>{u.prenom} {u.nom}</strong><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{u.username}</div></td>
                    <td style={td}>{u.grade_nom || '—'}{u.unite_nom && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.unite_nom}</div>}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {u.is_admin && <RoleBadge name="Admin" color="#e74c3c" />}
                        {u.is_etatmajor && <RoleBadge name="É-M" color="#f39c12" />}
                        {u.is_officier && <RoleBadge name="Officier" color="#f39c12" />}
                        {u.is_recenseur && <RoleBadge name="Administratif" color="#3498db" />}
                        {u.is_feldgendarmerie && <RoleBadge name="Feld" color="#8e44ad" />}
                        {u.is_sanitaets && <RoleBadge name="Sanit." color="#1abc9c" />}
                        {u.is_sousofficier && <RoleBadge name="SO" color="#27ae60" />}
                        {!u.is_admin && !u.is_recenseur && !u.is_officier && !u.is_sousofficier && !u.is_feldgendarmerie && !u.is_sanitaets && !u.is_etatmajor && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>—</span>}
                      </div>
                    </td>
                    <td style={td}>
                      <span style={{ color: u.active ? 'var(--success)' : 'var(--danger)' }}>{u.active ? '🟢' : '🔴'}</span>
                      {u.id === user.id && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 4 }}>Vous</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>)}

        {/* ═══════════════ ROLES TAB ═══════════════ */}
        {tab === 'roles' && (
          <div style={{ display: 'grid', gridTemplateColumns: (selectedRole || roleForm) ? '280px 1fr' : '1fr', gap: 'var(--space-md)' }}>
            {/* Left: Roles list */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem' }}>Rôles</h3>
                <button className="btn btn-primary btn-small" style={{ fontSize: '0.75rem' }} onClick={startCreateRole}>+ Nouveau</button>
              </div>

              {/* System roles */}
              <div className="paper-card" style={{ padding: 'var(--space-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '4px 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Système</div>
                {systemRoles.map(r => <RoleListItem key={r.id} role={r} active={selectedRole?.id === r.id} onClick={() => openRole(r)} />)}
              </div>

              {customRoles.length > 0 && (
                <div className="paper-card" style={{ padding: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '4px 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Personnalisés</div>
                  {customRoles.map(r => <RoleListItem key={r.id} role={r} active={selectedRole?.id === r.id} onClick={() => openRole(r)} />)}
                </div>
              )}
            </div>

            {/* Right: Role detail / editor */}
            {(selectedRole || roleForm) && (
              <div className="paper-card" style={{ padding: 'var(--space-lg)', maxHeight: '75vh', overflow: 'auto' }}>
                {roleForm ? (
                  /* ─── ROLE EDITOR ─── */
                  <>
                    <h2 style={{ margin: '0 0 var(--space-md)', fontSize: '1.1rem', textAlign: 'center' }}>
                      {selectedRole ? `✏️ Modifier : ${selectedRole.name}` : '✨ Nouveau rôle'}
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                      <div className="form-group">
                        <label className="form-label" style={labelSm}>Nom</label>
                        <input className="form-input" value={roleForm.name} onChange={e => setRoleForm(p => ({ ...p, name: e.target.value }))} disabled={selectedRole?.is_system} placeholder="Ex: Officier Médical" />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={labelSm}>Couleur</label>
                        <input type="color" className="form-input" value={roleForm.color} onChange={e => setRoleForm(p => ({ ...p, color: e.target.value }))} style={{ height: 36, cursor: 'pointer' }} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={labelSm}>Niveau</label>
                        <input type="number" className="form-input" value={roleForm.level} min={0} max={99} onChange={e => setRoleForm(p => ({ ...p, level: parseInt(e.target.value) || 0 }))} />
                      </div>
                    </div>

                    {/* Global perms */}
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>🌐 Permissions globales</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px', background: 'rgba(45,74,52,0.05)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                        {Object.entries(GLOBAL_PERM_LABELS).map(([perm, label]) => (
                          <PermChip key={perm} label={label} active={!!roleForm.permissions_global[perm]} onClick={() => toggleGlobalPerm(perm)} />
                        ))}
                      </div>
                    </div>

                    {/* Salon perms */}
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>📋 Permissions par salon <span style={{ fontWeight: 400, fontSize: '0.7rem', color: 'var(--text-muted)' }}>— Cliquer pour dérouler, cycler ✅/❌/➖</span></div>
                      <div style={{ maxHeight: 350, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)' }}>
                        {salonsData?.salons?.map(salon => (
                          <div key={salon}>
                            <div onClick={() => setExpandedSalons(p => ({ ...p, [salon]: !p[salon] }))}
                              style={{ padding: '6px 10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', background: expandedSalons[salon] ? 'rgba(45,74,52,0.06)' : '' }}>
                              <span>{SALON_LABELS[salon] || salon}</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                {Object.keys(roleForm.salon_permissions[salon] || {}).length > 0 ? `${Object.keys(roleForm.salon_permissions[salon]).length} override(s)` : '—'}
                                {' '}{expandedSalons[salon] ? '▲' : '▼'}
                              </span>
                            </div>
                            {expandedSalons[salon] && (
                              <div style={{ padding: '6px 10px', display: 'flex', flexWrap: 'wrap', gap: 4, borderBottom: '1px solid var(--border-color)', background: 'rgba(45,74,52,0.03)' }}>
                                {Object.entries(PERM_LABELS).map(([perm, label]) => {
                                  const state = roleForm.salon_permissions[salon]?.[perm] || 'inherit'
                                  return <TriStateChip key={perm} label={label} state={state} onClick={() => cycleSalonPerm(salon, perm)} />
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary btn-small" onClick={saveRole}>💾 Enregistrer</button>
                      <button className="btn btn-secondary btn-small" onClick={() => setRoleForm(null)}>Annuler</button>
                      {selectedRole && !selectedRole.is_system && <button className="btn btn-small" style={{ background: 'var(--danger)', color: '#fff', border: 'none' }} onClick={deleteRole}>🗑️ Supprimer</button>}
                    </div>
                  </>
                ) : selectedRole && (
                  /* ─── ROLE VIEW ─── */
                  <>
                    <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-sm)' }}>
                      <span style={{ fontSize: '1.5rem' }}>{ROLE_ICONS[selectedRole.name] || '🔹'}</span>
                      <h2 style={{ margin: '2px 0', fontSize: '1.1rem', color: selectedRole.color }}>{selectedRole.name}</h2>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Niveau {selectedRole.level} · {selectedRole.is_system ? '🔒 Système' : '✨ Personnalisé'} · {selectedRole.members?.length || 0} membre(s)
                      </div>
                    </div>

                    {/* Global perms */}
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>🌐 Permissions globales</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {Object.entries(selectedRole.permissions_global || {}).filter(([_, v]) => v).map(([perm]) => (
                          <span key={perm} style={{ ...chipStyle('#4a7c3f') }}>✅ {GLOBAL_PERM_LABELS[perm] || perm}</span>
                        ))}
                        {!Object.values(selectedRole.permissions_global || {}).some(v => v) && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aucune</span>}
                      </div>
                    </div>

                    {/* Salon overrides */}
                    {Object.keys(selectedRole.salon_permissions || {}).length > 0 && (
                      <div style={{ marginBottom: 'var(--space-md)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>📋 Overrides par salon</div>
                        {Object.entries(selectedRole.salon_permissions).map(([salon, perms]) => (
                          <div key={salon} style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{SALON_LABELS[salon] || salon}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                              {Object.entries(perms).map(([p, v]) => (
                                <span key={p} style={{ ...chipStyle(v === 'allow' ? '#4a7c3f' : '#8B0000'), fontSize: '0.6rem' }}>
                                  {v === 'allow' ? '✅' : '❌'} {PERM_LABELS[p] || p}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Members */}
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>👥 Membres ({selectedRole.members?.length || 0})</div>
                      <div style={{ maxHeight: 150, overflow: 'auto' }}>
                        {(selectedRole.members || []).map(m => (
                          <div key={m.id} style={{ padding: '3px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                            {m.prenom} {m.nom} <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>({m.username})</span>
                          </div>
                        ))}
                        {(!selectedRole.members?.length) && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aucun</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary btn-small" onClick={() => startEditRole(selectedRole)}>✏️ Modifier</button>
                      {selectedRole.is_system && DEFAULT_ROLE_SALONS[selectedRole.name] && (
                        <button className="btn btn-secondary btn-small" onClick={() => applyDefaultPerms(selectedRole)}>📋 Appliquer défauts</button>
                      )}
                      <button className="btn btn-secondary btn-small" onClick={() => setSelectedRole(null)}>Fermer</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ REGIMENT TAB ═══════════════ */}
        {tab === 'regiment' && (<>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            {[
              { id: 'effectifs', label: `👥 Effectifs (${regimentEffectifs.length})` },
              { id: 'transfers', label: `🔄 Transferts`, badge: pendingTransfers.length },
              { id: 'dismissals', label: `🚪 Renvois (${dismissals.length})` }
            ].map(t => (
              <button key={t.id} onClick={() => setRegTab(t.id)} className={`btn btn-small ${regTab === t.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ position: 'relative', fontSize: '0.8rem' }}>
                {t.label}
                {t.badge > 0 && <span style={{ background: '#e74c3c', color: '#fff', borderRadius: '50%', padding: '1px 5px', fontSize: '0.6rem', marginLeft: 4 }}>{t.badge}</span>}
              </button>
            ))}
          </div>

          {/* Effectifs list */}
          {regTab === 'effectifs' && (
            <div className="paper-card" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={th}>Effectif</th><th style={th}>Grade</th><th style={th}>Unité</th><th style={th}>Statut</th><th style={th}>Actions</th>
                </tr></thead>
                <tbody>
                  {filteredRegiment.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={td}><strong>{e.prenom} {e.nom}</strong>{e.username && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{e.username}</div>}</td>
                      <td style={td}>{e.grade_nom || '—'}</td>
                      <td style={td}>{e.unite_nom || '—'}</td>
                      <td style={td}>
                        {e.member_status === 'dismissed' ? <span style={{ color: '#8B0000', fontWeight: 600, fontSize: '0.75rem' }}>🚫 Renvoyé</span>
                          : e.member_status === 'transferred' ? <span style={{ color: '#c9a84c', fontSize: '0.75rem' }}>🔄 Transféré</span>
                          : <span style={{ color: 'var(--success)', fontSize: '0.75rem' }}>✅ Actif</span>}
                      </td>
                      <td style={td}>
                        {e.member_status === 'dismissed' ? (
                          <button className="btn btn-secondary btn-small" style={{ fontSize: '0.65rem' }} onClick={() => reinstate(e.id, `${e.prenom} ${e.nom}`)}>↩️ Réintégrer</button>
                        ) : (
                          <div style={{ display: 'flex', gap: 3 }}>
                            <button className="btn btn-small" onClick={() => { setRegimentModal({ type: 'transfer', effectif: e }); setMotif(''); setToUnite('') }}
                              style={{ fontSize: '0.65rem', background: 'linear-gradient(180deg,#c9a84c,#a88734)', color: '#1a1a1a', border: '1px solid #8B7355', padding: '2px 6px' }}>🔄</button>
                            <button className="btn btn-small" onClick={() => { setRegimentModal({ type: 'dismiss', effectif: e }); setMotif(''); setSeverity('simple') }}
                              style={{ fontSize: '0.65rem', background: 'linear-gradient(180deg,#a83232,#6b1010)', color: '#f5ecd7', border: '1px solid #5a0000', padding: '2px 6px' }}>🚪</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Transfers */}
          {regTab === 'transfers' && (
            <div className="paper-card" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={th}>Effectif</th><th style={th}>De → Vers</th><th style={th}>Motif</th><th style={th}>Statut</th><th style={th}>Actions</th>
                </tr></thead>
                <tbody>
                  {transfers.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={td}><strong>{t.effectif_prenom} {t.effectif_nom}</strong></td>
                      <td style={td}>{t.from_unite_nom} → {t.to_unite_nom}</td>
                      <td style={{ ...td, maxWidth: 180, fontSize: '0.75rem', fontStyle: 'italic' }}>« {t.motif} »</td>
                      <td style={td}>
                        {t.status === 'pending' ? <span style={{ color: '#c9a84c', fontWeight: 600 }}>⏳</span>
                          : t.status === 'approved' ? <span style={{ color: 'var(--success)' }}>✅</span>
                          : <span style={{ color: '#8B0000' }}>❌</span>}
                      </td>
                      <td style={td}>
                        {t.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 3 }}>
                            <button className="btn btn-small" style={{ fontSize: '0.65rem', background: '#4a7c3f', color: '#fff', border: 'none', padding: '2px 6px' }} onClick={() => handleTransferAction(t.id, 'approve')}>✅</button>
                            <button className="btn btn-small" style={{ fontSize: '0.65rem', background: '#8B0000', color: '#fff', border: 'none', padding: '2px 6px' }} onClick={() => handleTransferAction(t.id, 'reject')}>❌</button>
                          </div>
                        ) : <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.validated_by_name || ''}</span>}
                      </td>
                    </tr>
                  ))}
                  {!transfers.length && <tr><td colSpan="5" style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>Aucun transfert</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Dismissals */}
          {regTab === 'dismissals' && (
            <div className="paper-card" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={th}>Effectif</th><th style={th}>Unité</th><th style={th}>Motif</th><th style={th}>Type</th><th style={th}>Par</th><th style={th}>Date</th>
                </tr></thead>
                <tbody>
                  {dismissals.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={td}><strong>{d.effectif_prenom} {d.effectif_nom}</strong></td>
                      <td style={td}>{d.unite_nom}</td>
                      <td style={{ ...td, maxWidth: 180, fontSize: '0.75rem', fontStyle: 'italic', color: '#5a0000' }}>« {d.motif} »</td>
                      <td style={td}>{d.severity === 'definitive' ? <span style={{ color: '#8B0000', fontWeight: 700 }}>Définitif</span> : 'Simple'}</td>
                      <td style={td}>{d.decided_by_name}</td>
                      <td style={td}>{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                  {!dismissals.length && <tr><td colSpan="6" style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>Aucun renvoi</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>)}

      </>)}

      {/* ═══════════════ USER MODAL ═══════════════ */}
      {selectedUser && (
        <div onClick={() => setSelectedUser(null)} style={overlayStyle}>
          <div onClick={ev => ev.stopPropagation()} style={{ ...modalStyle, maxWidth: 520 }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-sm)' }}>
              <h2 style={{ margin: '0 0 2px', fontSize: '1.1rem' }}>{selectedUser.prenom} {selectedUser.nom}</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{selectedUser.username}</div>
              <div style={{ fontSize: '0.8rem' }}>{selectedUser.grade_nom || '—'} · {selectedUser.unite_nom || '—'}</div>
            </div>

            {/* Roles toggles */}
            <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: '0.9rem' }}>🔐 Rôles</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
              {roles.map(r => {
                const has = selectedUserRoles.some(ur => ur.id === r.id)
                const restricted = ['Administration', 'Etat-Major'].includes(r.name) && !user?.isAdmin
                return (
                  <div key={r.id} onClick={() => !restricted && toggleUserRole(r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                      padding: '6px 10px', border: `1px solid ${has ? (r.color || '#8B4513') : 'var(--border-color)'}`,
                      borderRadius: 'var(--border-radius)', cursor: restricted ? 'not-allowed' : 'pointer',
                      background: has ? `${r.color || '#8B4513'}10` : '', opacity: restricted ? 0.5 : 1,
                      transition: 'all 0.15s'
                    }}>
                    <span style={{ fontSize: '1rem', minWidth: 24, textAlign: 'center' }}>{ROLE_ICONS[r.name] || '🔹'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: has ? (r.color || '#8B4513') : 'var(--text-primary)' }}>{r.name}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Niveau {r.level}{r.is_system ? ' · Système' : ''}</div>
                    </div>
                    <Toggle active={has} color={r.color || '#8B4513'} />
                  </div>
                )
              })}
            </div>

            {/* Account actions */}
            <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: '0.9rem' }}>⚡ Compte</h3>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
              {user?.isAdmin && <button className="btn btn-secondary btn-small" onClick={toggleActive}>{selectedUser.active ? '🔴 Désactiver' : '🟢 Activer'}</button>}
              <button className="btn btn-secondary btn-small" onClick={async () => {
                const newPwd = prompt(`Nouveau MDP pour ${selectedUser.username} (min 6 car.) :`)
                if (!newPwd || newPwd.length < 6) { if (newPwd !== null) alert('Min 6 caractères'); return }
                try { const res = await api.put(`/admin/users/${selectedUser.id}/reset-password`, { new_password: newPwd }); flash('success', res.data.message) }
                catch (err) { flash('error', err.response?.data?.message || 'Erreur') }
              }}>🔑 Réinit. MDP</button>
              {user?.isAdmin && <button className="btn btn-small" style={{ background: 'var(--danger)', color: '#fff', border: 'none' }} onClick={deleteUser}>🗑️ Supprimer</button>}
            </div>
            <div style={{ textAlign: 'center' }}><button className="btn btn-secondary btn-small" onClick={() => setSelectedUser(null)}>Fermer</button></div>
          </div>
        </div>
      )}

      {/* ═══════════════ REGIMENT MODAL ═══════════════ */}
      {regimentModal && (
        <div onClick={() => setRegimentModal(null)} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalStyle, maxWidth: 460, borderColor: regimentModal.type === 'dismiss' ? '#8B0000' : '#8B7355' }}>
            <h2 style={{ margin: '0 0 var(--space-sm)', textAlign: 'center', fontSize: '1.1rem', color: regimentModal.type === 'dismiss' ? '#8B0000' : 'inherit' }}>
              {regimentModal.type === 'transfer' ? '🔄 Transfert' : '🚪 Renvoi'}
            </h2>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 var(--space-md)' }}>
              {regimentModal.effectif.grade_nom || ''} {regimentModal.effectif.prenom} {regimentModal.effectif.nom}
            </p>

            {regimentModal.type === 'transfer' && (
              <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                <label className="form-label" style={labelSm}>Unité de destination</label>
                <select className="form-input" value={toUnite} onChange={e => setToUnite(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {unites.filter(u => u.id !== regimentModal.effectif.unite_id).map(u => <option key={u.id} value={u.id}>{u.code} — {u.nom}</option>)}
                </select>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
              <label className="form-label" style={labelSm}>Motif <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(min 10 car.)</span></label>
              <textarea className="form-input" value={motif} onChange={e => setMotif(e.target.value)}
                placeholder={regimentModal.type === 'transfer' ? 'Raison du transfert...' : 'Raison du renvoi...'}
                style={{ minHeight: 70, fontFamily: 'var(--font-mono)', background: '#faf3e0', resize: 'vertical' }} />
            </div>

            {regimentModal.type === 'dismiss' && (
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label" style={labelSm}>Sévérité</label>
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.8rem' }}>
                    <input type="radio" value="simple" checked={severity === 'simple'} onChange={() => setSeverity('simple')} /> Simple
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.8rem', color: '#8B0000' }}>
                    <input type="radio" value="definitive" checked={severity === 'definitive'} onChange={() => setSeverity('definitive')} /> Définitif
                  </label>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
              {regimentModal.type === 'transfer' ? (
                <button onClick={submitTransfer} style={{ background: 'linear-gradient(180deg,#c9a84c,#a88734)', color: '#1a1a1a', border: '1px solid #8B7355', padding: '8px 18px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', borderRadius: 'var(--border-radius)', fontSize: '0.85rem' }}>
                  Confirmer
                </button>
              ) : (
                <button onClick={submitDismiss} style={{ background: 'linear-gradient(180deg,#a83232,#6b1010)', color: '#f5ecd7', border: '1px solid #5a0000', padding: '8px 18px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', borderRadius: 'var(--border-radius)', fontSize: '0.85rem' }}>
                  Confirmer le renvoi
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setRegimentModal(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Sub-components ─── */
function RoleBadge({ name, color }) {
  return <span style={{ fontSize: '0.65rem', padding: '1px 7px', borderRadius: 10, background: `${color}20`, color, fontWeight: 600, whiteSpace: 'nowrap' }}>{name}</span>
}

function RoleListItem({ role, active, onClick }) {
  const icon = ROLE_ICONS[role.name] || '🔹'
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer',
      borderLeft: `3px solid ${role.color || '#8B4513'}`, marginBottom: 2,
      background: active ? 'var(--military-light)' : '', borderRadius: '0 var(--border-radius) var(--border-radius) 0',
      transition: 'all 0.12s'
    }} onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--military-light)' }}
       onMouseLeave={e => { if (!active) e.currentTarget.style.background = '' }}>
      <span style={{ fontSize: '0.9rem' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: role.color }}>{role.name}</div>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Niv. {role.level} · {role.member_count || 0}</div>
      </div>
    </div>
  )
}

function Toggle({ active, color }) {
  return (
    <div style={{ width: 36, height: 20, borderRadius: 10, background: active ? color : 'var(--border-color)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: active ? 18 : 2, transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
    </div>
  )
}

function PermChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '3px 8px', fontSize: '0.7rem', borderRadius: 10, border: '1px solid',
      cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'var(--font-mono)',
      background: active ? '#4a7c3f' : 'transparent', color: active ? '#fff' : 'var(--text-primary)',
      borderColor: active ? '#4a7c3f' : 'var(--border-color)'
    }}>{active ? '✅' : '○'} {label}</button>
  )
}

function TriStateChip({ label, state, onClick }) {
  const s = { inherit: { bg: 'transparent', c: 'var(--text-muted)', b: 'var(--border-color)', i: '➖' },
    allow: { bg: '#4a7c3f', c: '#fff', b: '#4a7c3f', i: '✅' },
    deny: { bg: '#8B0000', c: '#fff', b: '#8B0000', i: '❌' } }[state] || { bg: 'transparent', c: 'var(--text-muted)', b: 'var(--border-color)', i: '➖' }
  return (
    <button onClick={onClick} style={{
      padding: '2px 7px', fontSize: '0.65rem', borderRadius: 8, cursor: 'pointer',
      background: s.bg, color: s.c, border: `1px solid ${s.b}`,
      fontFamily: 'var(--font-mono)', transition: 'all 0.1s'
    }}>{s.i} {label}</button>
  )
}

/* ─── Styles ─── */
const th = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)', whiteSpace: 'nowrap', fontSize: '0.8rem' }
const td = { padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'middle' }
const labelSm = { fontSize: '0.8rem' }
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalStyle = { background: 'var(--paper-bg)', border: '2px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 'var(--space-xl)', width: '92%', boxShadow: 'var(--shadow-heavy)', maxHeight: '90vh', overflow: 'auto' }
const chipStyle = (color) => ({ padding: '2px 7px', borderRadius: 8, background: `${color}15`, color, fontWeight: 600, fontSize: '0.65rem', whiteSpace: 'nowrap' })
