import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'

const NODE_W = 220
const NODE_H = 70

export default function Organigramme() {
  const { user } = useAuth()
  const [nodes, setNodes] = useState([])
  const [unites, setUnites] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [editNode, setEditNode] = useState(null)
  const [form, setForm] = useState({ effectif_id: '', titre_poste: '', unite_id: '' })
  const [searchText, setSearchText] = useState('')
  const [msg, setMsg] = useState('')
  const [linking, setLinking] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef()

  const canEdit = user?.isAdmin || user?.isEtatMajor

  useEffect(() => {
    load()
    api.get('/unites').then(r => setUnites(r.data.data || r.data)).catch(() => {})
  }, [])

  const load = () => api.get('/organigramme').then(r => {
    let data = r.data.data || []
    if (data.length > 0 && data.every(n => !n.pos_x && !n.pos_y)) {
      data = autoLayout(data)
    }
    setNodes(data)
  }).catch(() => {})

  const autoLayout = (data) => {
    const roots = data.filter(n => !n.parent_id)
    const children = (pid) => data.filter(n => n.parent_id === pid)
    let x = 50
    const layout = (node, depth) => {
      const kids = children(node.id)
      if (kids.length === 0) {
        node.pos_x = x
        node.pos_y = depth * 120 + 30
        x += NODE_W + 40
      } else {
        kids.forEach(k => layout(k, depth + 1))
        const firstX = kids[0].pos_x
        const lastX = kids[kids.length - 1].pos_x
        node.pos_x = (firstX + lastX) / 2
        node.pos_y = depth * 120 + 30
      }
    }
    roots.forEach(r => layout(r, 0))
    return data
  }

  const savePositions = useCallback(() => {
    const payload = nodes.map(n => ({ id: n.id, parent_id: n.parent_id, ordre: n.ordre || 0, pos_x: n.pos_x || 0, pos_y: n.pos_y || 0 }))
    api.put('/organigramme/bulk/save', { nodes: payload }).catch(() => {})
  }, [nodes])

  const resetForm = () => { setForm({ effectif_id: '', titre_poste: '', unite_id: '' }); setSearchText(''); setShowAdd(false); setEditNode(null) }

  const submit = async () => {
    if (!form.effectif_id && !form.titre_poste) { setMsg('Effectif ou titre requis'); return }
    try {
      if (editNode) {
        await api.put(`/organigramme/${editNode.id}`, { ...form, parent_id: editNode.parent_id, ordre: editNode.ordre, pos_x: editNode.pos_x, pos_y: editNode.pos_y })
      } else {
        const maxX = nodes.reduce((m, n) => Math.max(m, n.pos_x || 0), 0)
        await api.post('/organigramme', { ...form, parent_id: null, pos_x: maxX + NODE_W + 60, pos_y: 50 })
      }
      resetForm(); load()
      setMsg(editNode ? '✅ Modifié' : '✅ Ajouté'); setTimeout(() => setMsg(''), 2000)
    } catch (err) { setMsg(err.response?.data?.message || 'Erreur') }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce poste ?')) return
    try { await api.delete(`/organigramme/${id}`); load() } catch { setMsg('Erreur') }
  }

  // Drag
  const onNodeMouseDown = (e, node) => {
    if (!canEdit) return
    if (linking) {
      if (linking !== node.id) {
        setNodes(prev => prev.map(n => n.id === node.id ? { ...n, parent_id: linking } : n))
        api.put(`/organigramme/${node.id}`, { ...node, parent_id: linking, pos_x: node.pos_x, pos_y: node.pos_y }).catch(() => {})
      }
      setLinking(null)
      return
    }
    e.stopPropagation()
    const rect = canvasRef.current.getBoundingClientRect()
    const scrollLeft = canvasRef.current.scrollLeft
    const scrollTop = canvasRef.current.scrollTop
    setDragging(node.id)
    setDragOffset({ x: e.clientX - rect.left + scrollLeft - (node.pos_x || 0), y: e.clientY - rect.top + scrollTop - (node.pos_y || 0) })
  }

  const onCanvasMouseMove = (e) => {
    if (!dragging) return
    const rect = canvasRef.current.getBoundingClientRect()
    const scrollLeft = canvasRef.current.scrollLeft
    const scrollTop = canvasRef.current.scrollTop
    const x = e.clientX - rect.left + scrollLeft - dragOffset.x
    const y = e.clientY - rect.top + scrollTop - dragOffset.y
    setNodes(prev => prev.map(n => n.id === dragging ? { ...n, pos_x: Math.max(0, x), pos_y: Math.max(0, y) } : n))
  }

  const onCanvasMouseUp = () => {
    if (dragging) { savePositions(); setDragging(null) }
  }

  const getLines = () => {
    const lines = []
    nodes.forEach(n => {
      if (n.parent_id) {
        const parent = nodes.find(p => p.id === n.parent_id)
        if (parent) {
          lines.push({
            x1: (parent.pos_x || 0) + NODE_W / 2, y1: (parent.pos_y || 0) + NODE_H,
            x2: (n.pos_x || 0) + NODE_W / 2, y2: (n.pos_y || 0),
          })
        }
      }
    })
    return lines
  }

  const canvasW = Math.max(1200, nodes.reduce((m, n) => Math.max(m, (n.pos_x || 0) + NODE_W + 100), 0))
  const canvasH = Math.max(600, nodes.reduce((m, n) => Math.max(m, (n.pos_y || 0) + NODE_H + 100), 0))

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 8 }}>
        <BackButton label="← Tableau de bord" />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {linking && <span style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 700 }}>🔗 Cliquez sur le bloc enfant</span>}
          {linking && <button className="btn btn-secondary btn-sm" onClick={() => setLinking(null)}>✕</button>}
          {canEdit && <button className="btn btn-primary btn-small" onClick={() => { setShowAdd(!showAdd); setEditNode(null) }}>{showAdd ? '✕ Fermer' : '+ Nouveau poste'}</button>}
        </div>
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-sm)', fontFamily: 'var(--font-title, Georgia, serif)' }}>🗺️ Organigramme</h1>
      <p style={{ textAlign: 'center', marginBottom: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>7. Armeekorps — Organisation et Commandement</p>

      {msg && <div className="alert alert-success">{msg}</div>}

      {(showAdd || editNode) && canEdit && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-md)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>Effectif</label>
              <EffectifAutocomplete value={searchText} onChange={(text) => { setSearchText(text); if (!text) setForm(f => ({ ...f, effectif_id: '' })) }} onSelect={(eff) => { setForm(f => ({ ...f, effectif_id: eff.id })); setSearchText(`${eff.prenom} ${eff.nom}`) }} placeholder="Rechercher..." />
            </div>
            <div style={{ minWidth: 140 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>Titre du poste</label>
              <input className="form-input" value={form.titre_poste} onChange={e => setForm(f => ({ ...f, titre_poste: e.target.value }))} placeholder="Ex: Kommandeur" />
            </div>
            <div style={{ minWidth: 120 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600 }}>Unité</label>
              <select className="form-input" value={form.unite_id} onChange={e => setForm(f => ({ ...f, unite_id: e.target.value }))}>
                <option value="">—</option>
                {unites.map(u => <option key={u.id} value={u.id}>{u.code}. {u.nom}</option>)}
              </select>
            </div>
            <button className="btn btn-primary btn-sm" onClick={submit}>{editNode ? '✅ Modifier' : '➕ Ajouter'}</button>
            <button className="btn btn-secondary btn-sm" onClick={resetForm}>Annuler</button>
          </div>
        </div>
      )}

      {/* Canvas organigramme sur fond papier */}
      <div className="paper-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 8 }}>
        <div ref={canvasRef}
          onMouseMove={onCanvasMouseMove} onMouseUp={onCanvasMouseUp} onMouseLeave={onCanvasMouseUp}
          style={{
            position: 'relative', width: '100%', height: 'calc(100vh - 280px)', minHeight: 500,
            overflow: 'auto',
            cursor: dragging ? 'grabbing' : linking ? 'crosshair' : 'default',
          }}>
          
          {/* Lignes de liaison */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none' }}>
            {getLines().map((l, i) => {
              const midY = (l.y1 + l.y2) / 2
              return <path key={i} d={`M ${l.x1} ${l.y1} C ${l.x1} ${midY}, ${l.x2} ${midY}, ${l.x2} ${l.y2}`}
                fill="none" stroke="var(--border, #8b7d6b)" strokeWidth={2} opacity={0.7} />
            })}
          </svg>

          {/* Nodes */}
          {nodes.map(node => {
            const isRoot = !node.parent_id
            return (
              <div key={node.id}
                onMouseDown={(e) => onNodeMouseDown(e, node)}
                onDoubleClick={() => { if (canEdit) { setEditNode(node); setForm({ effectif_id: node.effectif_id || '', titre_poste: node.titre_poste || '', unite_id: node.unite_id || '' }); setSearchText(node.prenom ? `${node.prenom} ${node.nom}` : ''); setShowAdd(false) } }}
                style={{
                  position: 'absolute', left: node.pos_x || 0, top: node.pos_y || 0,
                  width: NODE_W, minHeight: NODE_H,
                  background: isRoot ? 'rgba(61,90,62,0.9)' : 'rgba(250,248,242,0.85)',
                  backdropFilter: 'blur(2px)',
                  color: isRoot ? '#fff' : 'var(--text, #2c2416)',
                  border: `2px solid ${node.unite_couleur || 'var(--border, #c4b99a)'}`,
                  borderRadius: 6, padding: '8px 12px',
                  cursor: dragging === node.id ? 'grabbing' : canEdit ? 'grab' : 'default',
                  boxShadow: dragging === node.id ? '0 8px 24px rgba(0,0,0,0.25)' : '0 1px 4px rgba(0,0,0,0.1)',
                  zIndex: dragging === node.id ? 100 : 1,
                  transition: dragging === node.id ? 'none' : 'box-shadow 0.2s',
                  userSelect: 'none',
                }}>
                {node.titre_poste && (
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.7, marginBottom: 2 }}>
                    {node.titre_poste}
                  </div>
                )}
                {node.effectif_id ? (
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.3, fontFamily: 'var(--font-body, Georgia, serif)' }}>
                    {node.grade_nom ? `${node.grade_nom} ` : ''}{node.prenom} {node.nom}
                  </div>
                ) : (
                  <div style={{ fontStyle: 'italic', fontSize: '0.78rem', opacity: 0.5 }}>Poste vacant</div>
                )}
                {node.unite_code && (
                  <div style={{ fontSize: '0.6rem', opacity: 0.6, marginTop: 2 }}>
                    {node.unite_code}. {node.unite_nom}
                  </div>
                )}

                {/* Boutons admin */}
                {canEdit && (
                  <div style={{ position: 'absolute', top: -8, right: -8, display: 'flex', gap: 2 }}>
                    <button onClick={(e) => { e.stopPropagation(); setLinking(node.id) }}
                      style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--border, #c4b99a)', background: 'var(--bg-card, #faf8f2)', cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Relier à un enfant">🔗</button>
                    <button onClick={(e) => { e.stopPropagation(); remove(node.id) }}
                      style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--border, #c4b99a)', background: 'var(--bg-card, #faf8f2)', cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Supprimer">🗑️</button>
                    {node.parent_id && (
                      <button onClick={(e) => { e.stopPropagation(); setNodes(prev => prev.map(n => n.id === node.id ? { ...n, parent_id: null } : n)); api.put(`/organigramme/${node.id}`, { ...node, parent_id: null }).catch(() => {}) }}
                        style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--border, #c4b99a)', background: 'var(--bg-card, #faf8f2)', cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Détacher du parent">✂️</button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {nodes.length === 0 && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '3rem' }}>🗺️</p>
              <p>Organigramme vide.{canEdit ? ' Ajoutez des postes avec le bouton ci-dessus.' : ''}</p>
            </div>
          )}
        </div>
      </div>

      {canEdit && nodes.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-sm)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Glissez les blocs pour les déplacer · 🔗 Relier · ✂️ Détacher · Double-clic pour modifier
        </div>
      )}
    </div>
  )
}
