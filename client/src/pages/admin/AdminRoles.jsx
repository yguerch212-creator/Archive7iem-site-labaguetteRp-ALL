import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import BackButton from '../../components/BackButton'
import api from '../../api/client'

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

export default function AdminRoles() {
  const { user } = useAuth()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [message, setMessage] = useState(null)
  const [salonsData, setSalonsData] = useState(null)
  const [expandedSalons, setExpandedSalons] = useState({})

  useEffect(() => { fetchRoles(); fetchSalons() }, [])

  const fetchRoles = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/roles')
      if (data.success) setRoles(data.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const fetchSalons = async () => {
    try {
      const { data } = await api.get('/roles/salons')
      if (data.success) setSalonsData(data.data)
    } catch {}
  }

  const flash = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 4000) }

  const openRole = async (role) => {
    try {
      const { data } = await api.get(`/roles/${role.id}`)
      if (data.success) {
        setSelected(data.data)
        setEditing(false)
        setForm(null)
      }
    } catch (e) { flash('error', 'Erreur chargement rôle') }
  }

  const startEdit = (role) => {
    setEditing(true)
    setForm({
      name: role.name,
      color: role.color || '#8B4513',
      icon: role.icon || '',
      level: role.level,
      permissions_global: { ...(role.permissions_global || {}) },
      salon_permissions: { ...(role.salon_permissions || {}) }
    })
  }

  const startCreate = () => {
    setSelected(null)
    setEditing(true)
    setForm({
      name: '', color: '#8B4513', icon: '', level: 5,
      permissions_global: {}, salon_permissions: {}
    })
  }

  const toggleGlobalPerm = (perm) => {
    setForm(prev => ({
      ...prev,
      permissions_global: {
        ...prev.permissions_global,
        [perm]: !prev.permissions_global[perm]
      }
    }))
  }

  const cycleSalonPerm = (salon, perm) => {
    setForm(prev => {
      const current = prev.salon_permissions[salon]?.[perm] || 'inherit'
      const next = current === 'inherit' ? 'allow' : current === 'allow' ? 'deny' : 'inherit'
      const salonPerms = { ...prev.salon_permissions }
      if (!salonPerms[salon]) salonPerms[salon] = {}
      if (next === 'inherit') {
        delete salonPerms[salon][perm]
        if (Object.keys(salonPerms[salon]).length === 0) delete salonPerms[salon]
      } else {
        salonPerms[salon] = { ...salonPerms[salon], [perm]: next }
      }
      return { ...prev, salon_permissions: salonPerms }
    })
  }

  const saveRole = async () => {
    try {
      if (selected) {
        const { data } = await api.put(`/roles/${selected.id}`, form)
        if (data.success) { flash('success', 'Rôle modifié'); fetchRoles(); openRole(selected) }
        else flash('error', data.message)
      } else {
        const { data } = await api.post('/roles', form)
        if (data.success) { flash('success', 'Rôle créé'); fetchRoles(); setEditing(false) }
        else flash('error', data.message)
      }
    } catch (e) { flash('error', e.response?.data?.message || 'Erreur') }
  }

  const deleteRole = async () => {
    if (!selected || selected.is_system) return
    if (!confirm(`Supprimer le rôle "${selected.name}" ?`)) return
    try {
      const { data } = await api.delete(`/roles/${selected.id}`)
      if (data.success) { flash('success', 'Rôle supprimé'); setSelected(null); fetchRoles() }
      else flash('error', data.message)
    } catch (e) { flash('error', e.response?.data?.message || 'Erreur') }
  }

  const toggleSalon = (salon) => {
    setExpandedSalons(prev => ({ ...prev, [salon]: !prev[salon] }))
  }

  const systemRoles = roles.filter(r => r.is_system)
  const customRoles = roles.filter(r => !r.is_system)

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <BackButton label="← Administration" to="/admin/users" />
        <button className="btn btn-primary btn-small" onClick={startCreate}>+ Nouveau rôle</button>
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>🔐 Gestion des Rôles</h1>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {loading ? <div className="paper-card" style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: selected || editing ? '1fr 1.5fr' : '1fr', gap: 'var(--space-lg)' }}>
          {/* Left: Role list */}
          <div>
            <div className="paper-card" style={{ padding: 'var(--space-md)' }}>
              <h3 style={{ margin: '0 0 var(--space-md)', fontSize: '0.95rem', borderBottom: '2px solid var(--border-color)', paddingBottom: 'var(--space-sm)' }}>
                🔒 Rôles système
              </h3>
              {systemRoles.map(r => (
                <RoleCard key={r.id} role={r} active={selected?.id === r.id} onClick={() => openRole(r)} />
              ))}
            </div>

            {customRoles.length > 0 && (
              <div className="paper-card" style={{ padding: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                <h3 style={{ margin: '0 0 var(--space-md)', fontSize: '0.95rem', borderBottom: '2px solid var(--border-color)', paddingBottom: 'var(--space-sm)' }}>
                  ✨ Rôles personnalisés
                </h3>
                {customRoles.map(r => (
                  <RoleCard key={r.id} role={r} active={selected?.id === r.id} onClick={() => openRole(r)} />
                ))}
              </div>
            )}
          </div>

          {/* Right: Role detail / Editor */}
          {(selected || editing) && (
            <div className="paper-card" style={{ padding: 'var(--space-lg)' }}>
              {editing && form ? (
                <>
                  <h2 style={{ margin: '0 0 var(--space-lg)', textAlign: 'center' }}>
                    {selected ? `Modifier : ${selected.name}` : 'Nouveau rôle'}
                  </h2>

                  {/* Basic info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                    <div className="form-group">
                      <label className="form-label">Nom</label>
                      <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        disabled={selected?.is_system} placeholder="Ex: Officier Médical" />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Couleur</label>
                        <input type="color" className="form-input" value={form.color}
                          onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ height: 38, cursor: 'pointer' }} />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Niveau</label>
                        <input type="number" className="form-input" value={form.level} min={0} max={99}
                          onChange={e => setForm(p => ({ ...p, level: parseInt(e.target.value) || 0 }))} />
                      </div>
                    </div>
                  </div>

                  {/* Global permissions */}
                  <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: '0.9rem' }}>🌐 Permissions globales</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 'var(--space-lg)', padding: 'var(--space-sm)', background: 'var(--military-light)', borderRadius: 'var(--border-radius)' }}>
                    {Object.entries(GLOBAL_PERM_LABELS).map(([perm, label]) => (
                      <button key={perm} onClick={() => toggleGlobalPerm(perm)}
                        style={{
                          padding: '4px 10px', fontSize: '0.75rem', borderRadius: 12, border: '1px solid',
                          cursor: 'pointer', transition: 'all 0.15s',
                          background: form.permissions_global[perm] ? '#4a7c3f' : 'transparent',
                          color: form.permissions_global[perm] ? '#fff' : 'var(--text-primary)',
                          borderColor: form.permissions_global[perm] ? '#4a7c3f' : 'var(--border-color)',
                          fontFamily: 'var(--font-mono)'
                        }}>
                        {form.permissions_global[perm] ? '✅' : '○'} {label}
                      </button>
                    ))}
                  </div>

                  {/* Salon permissions */}
                  <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: '0.9rem' }}>📋 Permissions par salon</h3>
                  <div style={{ maxHeight: 400, overflow: 'auto', marginBottom: 'var(--space-lg)' }}>
                    {salonsData?.salons?.map(salon => (
                      <div key={salon} style={{ marginBottom: 2 }}>
                        <div onClick={() => toggleSalon(salon)}
                          style={{
                            padding: '6px 10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', background: expandedSalons[salon] ? 'var(--military-light)' : '',
                            borderRadius: 'var(--border-radius)', fontSize: '0.85rem', fontWeight: 600,
                            border: '1px solid var(--border-color)'
                          }}>
                          <span>{SALON_LABELS[salon] || salon}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {Object.keys(form.salon_permissions[salon] || {}).length > 0
                              ? `${Object.keys(form.salon_permissions[salon]).length} overrides`
                              : 'hérité'}
                            {' '}{expandedSalons[salon] ? '▲' : '▼'}
                          </span>
                        </div>
                        {expandedSalons[salon] && (
                          <div style={{ padding: '8px 10px', display: 'flex', flexWrap: 'wrap', gap: 6, borderBottom: '1px solid var(--border-color)' }}>
                            {Object.entries(PERM_LABELS).map(([perm, label]) => {
                              const state = form.salon_permissions[salon]?.[perm] || 'inherit'
                              return (
                                <TriStateButton key={perm} label={label} state={state}
                                  onClick={() => cycleSalonPerm(salon, perm)} />
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={saveRole}>💾 Enregistrer</button>
                    <button className="btn btn-secondary" onClick={() => { setEditing(false); if (!selected) setSelected(null) }}>Annuler</button>
                    {selected && !selected.is_system && (
                      <button className="btn btn-small" style={{ background: 'var(--danger)', color: 'white', border: 'none' }} onClick={deleteRole}>
                        🗑️ Supprimer
                      </button>
                    )}
                  </div>
                </>
              ) : selected && (
                <>
                  {/* View mode */}
                  <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-md)' }}>
                    <span style={{ fontSize: '2rem' }}>{selected.icon || '🔹'}</span>
                    <h2 style={{ margin: '4px 0', color: selected.color }}>{selected.name}</h2>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Niveau {selected.level} · {selected.is_system ? '🔒 Système' : '✨ Personnalisé'} · {selected.members?.length || 0} membre(s)
                    </p>
                  </div>

                  {/* Global perms display */}
                  <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: '0.9rem' }}>🌐 Permissions globales</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 'var(--space-lg)' }}>
                    {Object.entries(selected.permissions_global || {}).filter(([_, v]) => v).map(([perm]) => (
                      <span key={perm} style={{ ...badgeStyle('#4a7c3f'), fontSize: '0.7rem' }}>
                        ✅ {GLOBAL_PERM_LABELS[perm] || perm}
                      </span>
                    ))}
                    {Object.keys(selected.permissions_global || {}).filter(k => selected.permissions_global[k]).length === 0 && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aucune permission globale</span>
                    )}
                  </div>

                  {/* Salon overrides display */}
                  {Object.keys(selected.salon_permissions || {}).length > 0 && (
                    <>
                      <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: '0.9rem' }}>📋 Overrides par salon</h3>
                      {Object.entries(selected.salon_permissions).map(([salon, perms]) => (
                        <div key={salon} style={{ marginBottom: 'var(--space-sm)' }}>
                          <strong style={{ fontSize: '0.8rem' }}>{SALON_LABELS[salon] || salon}</strong>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 2 }}>
                            {Object.entries(perms).map(([p, v]) => (
                              <span key={p} style={{ ...badgeStyle(v === 'allow' ? '#4a7c3f' : '#8B0000'), fontSize: '0.65rem' }}>
                                {v === 'allow' ? '✅' : '❌'} {PERM_LABELS[p] || p}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Members */}
                  <h3 style={{ margin: 'var(--space-lg) 0 var(--space-sm)', fontSize: '0.9rem' }}>👥 Membres ({selected.members?.length || 0})</h3>
                  <div style={{ maxHeight: 200, overflow: 'auto', marginBottom: 'var(--space-lg)' }}>
                    {(selected.members || []).map(m => (
                      <div key={m.id} style={{ padding: '4px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                        {m.prenom} {m.nom} <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>({m.username})</span>
                      </div>
                    ))}
                    {(!selected.members || selected.members.length === 0) && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucun membre</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
                    <button className="btn btn-primary btn-small" onClick={() => startEdit(selected)}>✏️ Modifier</button>
                    <button className="btn btn-secondary btn-small" onClick={() => setSelected(null)}>Fermer</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RoleCard({ role, active, onClick }) {
  return (
    <div onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
        padding: '8px 12px', marginBottom: 4, cursor: 'pointer',
        borderLeft: `4px solid ${role.color || '#8B4513'}`,
        borderRight: active ? `4px solid ${role.color || '#8B4513'}` : '4px solid transparent',
        background: active ? 'var(--military-light)' : '',
        borderRadius: 'var(--border-radius)', transition: 'all 0.15s'
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--military-light)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = '' }}
    >
      <span style={{ fontSize: '1.2rem', minWidth: 28, textAlign: 'center' }}>{role.icon || '🔹'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: role.color }}>{role.name}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Niv. {role.level} · {role.member_count || 0} membre(s)</div>
      </div>
      {role.is_system && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>🔒</span>}
    </div>
  )
}

function TriStateButton({ label, state, onClick }) {
  const colors = {
    inherit: { bg: 'transparent', color: 'var(--text-muted)', border: 'var(--border-color)', icon: '➖' },
    allow: { bg: '#4a7c3f', color: '#fff', border: '#4a7c3f', icon: '✅' },
    deny: { bg: '#8B0000', color: '#fff', border: '#8B0000', icon: '❌' }
  }
  const c = colors[state] || colors.inherit
  return (
    <button onClick={onClick} style={{
      padding: '3px 8px', fontSize: '0.7rem', borderRadius: 10, cursor: 'pointer',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      fontFamily: 'var(--font-mono)', transition: 'all 0.15s'
    }}>
      {c.icon} {label}
    </button>
  )
}

const badgeStyle = (color) => ({
  padding: '2px 8px', borderRadius: 10, background: `${color}20`, color, fontWeight: 600, whiteSpace: 'nowrap'
})
