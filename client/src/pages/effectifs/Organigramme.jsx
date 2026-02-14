import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'
import LayoutEditor from '../../components/LayoutEditor'
import LayoutRenderer from '../../components/LayoutRenderer'

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
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  
  // Layout editor state
  const [mode, setMode] = useState('view') // 'view' | 'tree' | 'layout'
  const [savedLayout, setSavedLayout] = useState(null)
  const [layoutBlocks, setLayoutBlocks] = useState([])
  const [layoutLoading, setLayoutLoading] = useState(true)

  const canEdit = user?.isAdmin || user?.isEtatMajor

  useEffect(() => {
    load()
    loadLayout()
    api.get('/unites').then(r => setUnites(r.data.data || r.data)).catch(() => {})
  }, [])

  const load = () => api.get('/organigramme').then(r => {
    let data = r.data.data || []
    if (data.length > 0 && data.every(n => !n.pos_x && !n.pos_y)) {
      data = autoLayout(data)
    }
    setNodes(data)
  }).catch(() => {})

  const loadLayout = () => {
    api.get('/organigramme/layout').then(r => {
      const data = r.data.data
      if (data?.layout) {
        const layout = typeof data.layout === 'string' ? JSON.parse(data.layout) : data.layout
        setSavedLayout(layout)
        if (layout.blocks) setLayoutBlocks(layout.blocks)
        // If there's a published layout, default to view mode
        if (layout.html_published) setMode('view')
        else setMode('tree')
      } else {
        setMode('tree')
      }
      setLayoutLoading(false)
    }).catch(() => { setLayoutLoading(false); setMode('tree') })
  }

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

  // Generate default layout blocks from nodes
  const generateDefaultBlocks = () => {
    const b = []
    let y = 30
    b.push({ id: 'header', type: 'title', content: '<b>ORGANIGRAMME</b>', x: 200, y, w: 400, h: 50 })
    y += 60
    b.push({ id: 'subtitle', type: 'text', content: '7. Armeekorps — Organisation et Commandement', x: 150, y, w: 500, h: 30 })
    y += 50
    b.push({ id: 'sep1', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
    y += 30

    // Add each node as a block
    const roots = nodes.filter(n => !n.parent_id)
    const children = (pid) => nodes.filter(n => n.parent_id === pid)
    
    const addNode = (node, depth) => {
      const indent = depth * 30
      const label = `${node.titre_poste ? `<b>${node.titre_poste}</b><br/>` : ''}${node.grade_nom || ''} ${node.prenom || ''} ${node.nom || ''}${node.unite_code ? ` — ${node.unite_code}. ${node.unite_nom}` : ''}${!node.effectif_id ? '<i>Poste vacant</i>' : ''}`
      b.push({ id: `node-${node.id}`, type: 'text', content: label, x: 40 + indent, y, w: 500 - indent, h: 40 })
      y += 50
      children(node.id).forEach(c => addNode(c, depth + 1))
    }
    roots.forEach(r => addNode(r, 0))

    b.push({ id: 'sep2', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
    y += 20
    b.push({ id: 'footer', type: 'text', content: `<i>Mis à jour le ${new Date().toLocaleDateString('fr-FR')}</i>`, x: 40, y, w: 400, h: 25 })

    return b
  }

  const handleLayoutSave = async (newBlocks) => {
    try {
      await api.put('/organigramme/layout', { layout: { blocks: newBlocks } })
      setLayoutBlocks(newBlocks)
      setMsg('💾 Mise en page sauvegardée'); setTimeout(() => setMsg(''), 3000)
    } catch (err) { setMsg('❌ Erreur: ' + (err.response?.data?.message || err.message)) }
  }

  const handleLayoutPublish = async (html, publishedBlocks) => {
    try {
      await api.put('/organigramme/layout', { layout: { blocks: publishedBlocks || layoutBlocks, html_published: html } })
      setSavedLayout({ blocks: publishedBlocks || layoutBlocks, html_published: html })
      setMode('view')
      setMsg('📜 Organigramme publié !'); setTimeout(() => setMsg(''), 3000)
    } catch (err) { setMsg('❌ Erreur') }
  }

  // Drag handlers for tree mode
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
    setDragging(node.id)
    setDragOffset({ x: e.clientX - (node.pos_x + canvasOffset.x), y: e.clientY - (node.pos_y + canvasOffset.y) })
  }

  const onCanvasMouseMove = (e) => {
    if (dragging) {
      const x = e.clientX - dragOffset.x - canvasOffset.x
      const y = e.clientY - dragOffset.y - canvasOffset.y
      setNodes(prev => prev.map(n => n.id === dragging ? { ...n, pos_x: Math.max(0, x), pos_y: Math.max(0, y) } : n))
    } else if (panning) {
      setCanvasOffset(o => ({ x: o.x + e.clientX - panStart.x, y: o.y + e.clientY - panStart.y }))
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  const onCanvasMouseUp = () => {
    if (dragging) { savePositions(); setDragging(null) }
    if (panning) setPanning(false)
  }

  const onCanvasBgDown = (e) => {
    if (e.target === canvasRef.current || e.target.tagName === 'svg') {
      setPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
    }
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

  if (layoutLoading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>

  // VIEW MODE — show published layout
  if (mode === 'view' && savedLayout?.html_published) {
    return (
      <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 8 }}>
          <BackButton label="← Tableau de bord" />
          <div style={{ display: 'flex', gap: 6 }}>
            {canEdit && <button className="btn btn-secondary btn-small" onClick={() => setMode('tree')}>🗺️ Gérer les postes</button>}
            {canEdit && <button className="btn btn-primary btn-small" onClick={() => { if (layoutBlocks.length === 0) setLayoutBlocks(generateDefaultBlocks()); setMode('layout') }}>✏️ Modifier la mise en page</button>}
          </div>
        </div>
        <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>🗺️ Organigramme — 7. Armeekorps</h1>
        {msg && <div className="alert alert-success">{msg}</div>}
        <LayoutRenderer html={savedLayout.html_published} />
      </div>
    )
  }

  // LAYOUT EDITOR MODE
  if (mode === 'layout' && canEdit) {
    return (
      <div style={{ padding: '1rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
          <button className="btn btn-secondary btn-small" onClick={() => setMode(savedLayout?.html_published ? 'view' : 'tree')}>← Retour</button>
          {msg && <div className={`alert ${msg.includes('❌') ? 'alert-danger' : 'alert-success'}`} style={{ margin: 0 }}>{msg}</div>}
        </div>
        <LayoutEditor
          blocks={layoutBlocks.length > 0 ? layoutBlocks : generateDefaultBlocks()}
          onSave={handleLayoutSave}
          onPublish={handleLayoutPublish}
          title="Organigramme — 7. Armeekorps"
        />
      </div>
    )
  }

  // TREE MANAGEMENT MODE (admin/etat-major only for editing, everyone can see)
  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 8 }}>
        <BackButton label="← Tableau de bord" />
        <div style={{ display: 'flex', gap: 6 }}>
          {linking && <span style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 700 }}>🔗 Cliquez sur un bloc enfant pour le relier</span>}
          {linking && <button className="btn btn-secondary btn-sm" onClick={() => setLinking(null)}>✕ Annuler</button>}
          {savedLayout?.html_published && <button className="btn btn-secondary btn-small" onClick={() => setMode('view')}>👁️ Voir la mise en page</button>}
          {canEdit && <button className="btn btn-secondary btn-small" onClick={() => { if (layoutBlocks.length === 0) setLayoutBlocks(generateDefaultBlocks()); setMode('layout') }}>✏️ Mise en page</button>}
          {canEdit && <button className="btn btn-primary btn-small" onClick={() => { setShowAdd(!showAdd); setEditNode(null) }}>{showAdd ? '✕' : '+ Nouveau poste'}</button>}
        </div>
      </div>
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>🗺️ Organigramme — 7. Armeekorps</h1>
      {msg && <div className="alert alert-success">{msg}</div>}

      {(showAdd || editNode) && (
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

      <div className="paper-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 8 }}>
        <div ref={canvasRef}
          onMouseMove={onCanvasMouseMove} onMouseUp={onCanvasMouseUp} onMouseLeave={onCanvasMouseUp}
          onMouseDown={onCanvasBgDown}
          style={{
            position: 'relative', width: '100%', height: 'calc(100vh - 280px)', minHeight: 500,
            overflow: 'auto', cursor: panning ? 'grabbing' : linking ? 'crosshair' : 'default',
            background: 'repeating-conic-gradient(rgba(0,0,0,0.03) 0% 25%, transparent 0% 50%) 0 0 / 40px 40px'
          }}>
          <svg style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none' }}>
            {getLines().map((l, i) => {
              const midY = (l.y1 + l.y2) / 2
              return <path key={i} d={`M ${l.x1} ${l.y1} C ${l.x1} ${midY}, ${l.x2} ${midY}, ${l.x2} ${l.y2}`} fill="none" stroke="#8b7d6b" strokeWidth={2} strokeDasharray="6 3" opacity={0.6} />
            })}
          </svg>

          {nodes.map(node => (
            <div key={node.id}
              onMouseDown={(e) => onNodeMouseDown(e, node)}
              onDoubleClick={() => { if (canEdit) { setEditNode(node); setForm({ effectif_id: node.effectif_id || '', titre_poste: node.titre_poste || '', unite_id: node.unite_id || '' }); setSearchText(node.prenom ? `${node.prenom} ${node.nom}` : ''); setShowAdd(false) } }}
              style={{
                position: 'absolute', left: node.pos_x || 0, top: node.pos_y || 0,
                width: NODE_W, minHeight: NODE_H,
                background: node.parent_id ? '#faf8f2' : '#3d5a3e',
                color: node.parent_id ? 'inherit' : '#fff',
                border: `2px solid ${node.unite_couleur || '#c4b99a'}`,
                borderRadius: 8, padding: '8px 12px',
                cursor: dragging === node.id ? 'grabbing' : canEdit ? 'grab' : 'default',
                boxShadow: dragging === node.id ? '0 8px 24px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.08)',
                zIndex: dragging === node.id ? 100 : 1,
                transition: dragging === node.id ? 'none' : 'box-shadow 0.2s',
                userSelect: 'none',
              }}>
              {node.titre_poste && <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: 1, opacity: 0.65, textTransform: 'uppercase', marginBottom: 2 }}>{node.titre_poste}</div>}
              {node.effectif_id ? (
                <div style={{ fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.2 }}>{node.grade_nom ? `${node.grade_nom} ` : ''}{node.prenom} {node.nom}</div>
              ) : (
                <div style={{ fontStyle: 'italic', fontSize: '0.78rem', opacity: 0.5 }}>Poste vacant</div>
              )}
              {node.unite_code && <div style={{ fontSize: '0.62rem', opacity: 0.6, marginTop: 2 }}>{node.unite_code}. {node.unite_nom}</div>}

              {canEdit && (
                <div style={{ position: 'absolute', top: -8, right: -8, display: 'flex', gap: 2 }}>
                  <button onClick={(e) => { e.stopPropagation(); setLinking(node.id) }}
                    style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #c4b99a', background: '#faf8f2', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Relier à un enfant">🔗</button>
                  <button onClick={(e) => { e.stopPropagation(); remove(node.id) }}
                    style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #c4b99a', background: '#faf8f2', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Supprimer">🗑️</button>
                  {node.parent_id && (
                    <button onClick={(e) => { e.stopPropagation(); setNodes(prev => prev.map(n => n.id === node.id ? { ...n, parent_id: null } : n)); api.put(`/organigramme/${node.id}`, { ...node, parent_id: null }).catch(() => {}) }}
                      style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #c4b99a', background: '#faf8f2', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Détacher du parent">✂️</button>
                  )}
                </div>
              )}
            </div>
          ))}

          {nodes.length === 0 && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '3rem' }}>🗺️</p>
              <p>Organigramme vide.{canEdit ? ' Ajoutez des postes avec le bouton ci-dessus.' : ''}</p>
            </div>
          )}
        </div>
      </div>

      {canEdit && nodes.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-sm)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Glissez les blocs pour les déplacer · 🔗 pour relier · ✂️ pour détacher · Double-clic pour modifier
        </div>
      )}
    </div>
  )
}
