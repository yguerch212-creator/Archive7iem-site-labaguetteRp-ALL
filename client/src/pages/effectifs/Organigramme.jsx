import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'

export default function Organigramme() {
  const { user } = useAuth()
  const [nodes, setNodes] = useState([])
  const [unites, setUnites] = useState([])
  const [showAdd, setShowAdd] = useState(null) // parent_id or 'root'
  const [editNode, setEditNode] = useState(null)
  const [form, setForm] = useState({ effectif_id: '', titre_poste: '', unite_id: '' })
  const [searchText, setSearchText] = useState('')
  const [msg, setMsg] = useState('')

  const canEdit = user?.isAdmin || user?.isOfficier

  useEffect(() => {
    load()
    api.get('/unites').then(r => setUnites(r.data.data || r.data)).catch(() => {})
  }, [])

  const load = () => api.get('/organigramme').then(r => setNodes(r.data.data || [])).catch(() => {})

  const resetForm = () => { setForm({ effectif_id: '', titre_poste: '', unite_id: '' }); setSearchText(''); setShowAdd(null); setEditNode(null) }

  const submit = async () => {
    if (!form.effectif_id && !form.titre_poste) { setMsg('Effectif ou titre requis'); return }
    try {
      if (editNode) {
        await api.put(`/organigramme/${editNode.id}`, { ...form, parent_id: editNode.parent_id, ordre: editNode.ordre })
      } else {
        const parentId = showAdd === 'root' ? null : showAdd
        const siblings = nodes.filter(n => n.parent_id === parentId)
        await api.post('/organigramme', { ...form, parent_id: parentId, ordre: siblings.length })
      }
      resetForm(); load()
      setMsg(editNode ? '✅ Modifié' : '✅ Ajouté'); setTimeout(() => setMsg(''), 2000)
    } catch (err) { setMsg(err.response?.data?.message || 'Erreur') }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce poste ? Les sous-postes seront rattachés au parent.')) return
    try { await api.delete(`/organigramme/${id}`); load() } catch { setMsg('Erreur') }
  }

  const moveUp = async (node) => {
    const siblings = nodes.filter(n => n.parent_id === node.parent_id).sort((a, b) => a.ordre - b.ordre)
    const idx = siblings.findIndex(s => s.id === node.id)
    if (idx <= 0) return
    const updates = siblings.map((s, i) => ({ id: s.id, parent_id: s.parent_id, ordre: i }))
    // Swap
    const temp = updates[idx].ordre; updates[idx].ordre = updates[idx - 1].ordre; updates[idx - 1].ordre = temp
    try { await api.put('/organigramme/bulk/save', { nodes: updates }); load() } catch {}
  }

  const startEdit = (node) => {
    setEditNode(node)
    setForm({ effectif_id: node.effectif_id || '', titre_poste: node.titre_poste || '', unite_id: node.unite_id || '' })
    setSearchText(node.prenom ? `${node.prenom} ${node.nom}` : '')
    setShowAdd(null)
  }

  // Build tree
  const buildTree = (parentId) => {
    return nodes.filter(n => n.parent_id === parentId).sort((a, b) => a.ordre - b.ordre)
  }

  const renderNode = (node, depth = 0) => {
    const children = buildTree(node.id)
    const isEditing = editNode?.id === node.id

    return (
      <div key={node.id} style={{ marginLeft: depth > 0 ? 30 : 0 }}>
        {/* Connector line */}
        {depth > 0 && (
          <div style={{ borderLeft: '2px solid #c4b99a', borderBottom: '2px solid #c4b99a', width: 20, height: 20, marginLeft: -20, display: 'inline-block', verticalAlign: 'middle' }} />
        )}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: depth === 0 ? '#3d5a3e' : '#faf8f2',
          color: depth === 0 ? '#fff' : 'inherit',
          border: `2px solid ${node.unite_couleur || '#c4b99a'}`,
          borderRadius: 6, padding: '10px 16px', marginBottom: 8,
          minWidth: 200, position: 'relative',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
        }}>
          <div style={{ flex: 1 }}>
            {node.titre_poste && <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: 1, opacity: 0.7, textTransform: 'uppercase' }}>{node.titre_poste}</div>}
            {node.effectif_id ? (
              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                {node.grade_nom || ''} {node.prenom} {node.nom}
              </div>
            ) : (
              <div style={{ fontStyle: 'italic', fontSize: '0.82rem', opacity: 0.6 }}>Poste vacant</div>
            )}
            {node.unite_code && <div style={{ fontSize: '0.68rem', opacity: 0.7 }}>{node.unite_code}. {node.unite_nom}</div>}
          </div>
          {canEdit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.7rem' }}>
              <button onClick={() => startEdit(node)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }} title="Modifier">✏️</button>
              <button onClick={() => { setShowAdd(node.id); setEditNode(null); setForm({ effectif_id: '', titre_poste: '', unite_id: '' }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }} title="Ajouter sous-poste">➕</button>
              <button onClick={() => moveUp(node)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }} title="Monter">⬆️</button>
              <button onClick={() => remove(node.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }} title="Supprimer">🗑️</button>
            </div>
          )}
        </div>

        {/* Edit form inline */}
        {isEditing && (
          <div style={{ marginLeft: depth > 0 ? 0 : 0, marginBottom: 8 }}>
            {renderForm(true)}
          </div>
        )}

        {/* Add child form */}
        {showAdd === node.id && !editNode && (
          <div style={{ marginLeft: 30, marginBottom: 8 }}>
            {renderForm(false)}
          </div>
        )}

        {/* Children */}
        <div style={{ marginLeft: depth > 0 ? 10 : 20 }}>
          {children.map(c => renderNode(c, depth + 1))}
        </div>
      </div>
    )
  }

  const renderForm = (isEdit) => (
    <div style={{ background: '#f0ead6', border: '1px dashed #c4b99a', borderRadius: 6, padding: 12, maxWidth: 450 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>Effectif (officier)</label>
          <EffectifAutocomplete value={searchText} onChange={(text) => { setSearchText(text); if (!text) setForm(f => ({ ...f, effectif_id: '' })) }} onSelect={(eff) => { setForm(f => ({ ...f, effectif_id: eff.id })); setSearchText(`${eff.prenom} ${eff.nom}`) }} placeholder="Rechercher un effectif..." />
        </div>
        <div style={{ minWidth: 140 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>Titre du poste</label>
          <input className="form-input" value={form.titre_poste} onChange={e => setForm(f => ({ ...f, titre_poste: e.target.value }))} placeholder="Ex: Kommandeur" style={{ fontSize: '0.82rem' }} />
        </div>
        <div style={{ minWidth: 120 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>Unité</label>
          <select className="form-input" value={form.unite_id} onChange={e => setForm(f => ({ ...f, unite_id: e.target.value }))} style={{ fontSize: '0.82rem' }}>
            <option value="">—</option>
            {unites.map(u => <option key={u.id} value={u.id}>{u.code}. {u.nom}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={submit}>{isEdit ? '✅ Modifier' : '➕ Ajouter'}</button>
        <button className="btn btn-secondary btn-sm" onClick={resetForm}>Annuler</button>
      </div>
    </div>
  )

  const roots = buildTree(null)

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton label="← Tableau de bord" />
        {canEdit && <button className="btn btn-primary btn-small" onClick={() => { setShowAdd('root'); setEditNode(null); setForm({ effectif_id: '', titre_poste: '', unite_id: '' }) }}>+ Poste racine</button>}
      </div>
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>🗺️ Organigramme — 7. Armeekorps</h1>
      {msg && <div className="alert alert-success">{msg}</div>}

      {/* Root add form */}
      {showAdd === 'root' && !editNode && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>{renderForm(false)}</div>
      )}

      <div className="paper-card" style={{ padding: 'var(--space-xl)', overflow: 'auto' }}>
        {roots.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>
            <p style={{ fontSize: '2rem' }}>🗺️</p>
            <p>Organigramme vide. {canEdit ? 'Ajoutez des postes avec le bouton ci-dessus.' : ''}</p>
          </div>
        ) : (
          roots.map(r => renderNode(r, 0))
        )}
      </div>
    </div>
  )
}
