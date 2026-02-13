import { useState, useEffect, useRef, useCallback } from 'react'
import interact from 'interactjs'
import apiClient from '../api/client'
import SignatureCanvas from './SignatureCanvas'
import './layout-editor.css'

const BLOCK_TYPES = [
  { type: 'title', label: 'Titre', icon: '📌' },
  { type: 'text', label: 'Texte', icon: '📝' },
  { type: 'document', label: 'Document', icon: '📎' },
  { type: 'signature', label: 'Signature', icon: '✍️' },
  { type: 'stamp', label: 'Tampon', icon: '🔏' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'separator', label: 'Séparateur', icon: '━' },
]

const DOC_CATEGORIES = [
  { key: 'rapport', label: '📋 Rapports', icon: '📋', endpoint: '/rapports', mapFn: (r) => ({ id: r.id, label: `${r.titre || r.type}`, sub: `${r.auteur_nom || '?'} — ${r.date_rp || ''}`, badge: r.type, url: `/rapports/${r.id}` }) },
  { key: 'visite', label: '🏥 Visites médicales', icon: '🏥', endpoint: '/medical', mapFn: (r) => ({ id: r.id, label: `${r.effectif_prenom || ''} ${r.effectif_nom || ''}`, sub: `${r.date_visite_rp || ''} — ${r.statut || ''}`, badge: 'visite', url: `/medical/${r.id}` }) },
  { key: 'telegramme', label: '📨 Télégrammes', icon: '📨', endpoint: '/telegrammes', mapFn: (r) => ({ id: r.id, label: `${r.numero || 'TEL'} — ${(r.objet || '').substring(0, 40)}`, sub: `${r.expediteur_texte || '?'} → ${r.destinataire_texte || '?'}`, badge: r.priorite || 'normal', url: `/telegrammes` }) },
  { key: 'interdit', label: '⛔ Interdits de front', icon: '⛔', endpoint: '/interdits', mapFn: (r) => ({ id: r.id, label: `${r.effectif_prenom || ''} ${r.effectif_nom || ''}`, sub: `${(r.motif || '').substring(0, 50)}`, badge: r.statut || 'actif', url: `/interdits` }) },
  { key: 'piece', label: '⚖️ Pièces d\'affaire', icon: '⚖️', endpoint: null, mapFn: null },
]

const GRID = 5

let blockCounter = Date.now()

export default function LayoutEditor({ blocks: initialBlocks = [], onSave, onPublish, title = 'Éditeur de mise en page', width = 800, height = 1100, readOnly = false, affaireId = null }) {
  const [blocks, setBlocks] = useState(initialBlocks)
  const [selectedId, setSelectedId] = useState(null)
  const [history, setHistory] = useState([initialBlocks])
  const [historyIdx, setHistoryIdx] = useState(0)
  const [showSignatureModal, setShowSignatureModal] = useState(null) // blockId
  const [showDocPicker, setShowDocPicker] = useState(null) // blockId
  const [msg, setMsg] = useState('')
  const canvasRef = useRef(null)

  // Push to history on significant changes
  const pushHistory = useCallback((newBlocks) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIdx + 1)
      return [...trimmed, newBlocks].slice(-30)
    })
    setHistoryIdx(prev => prev + 1)
  }, [historyIdx])

  const undo = () => {
    if (historyIdx <= 0) return
    const newIdx = historyIdx - 1
    setHistoryIdx(newIdx)
    setBlocks(history[newIdx])
  }

  const redo = () => {
    if (historyIdx >= history.length - 1) return
    const newIdx = historyIdx + 1
    setHistoryIdx(newIdx)
    setBlocks(history[newIdx])
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo() }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo() }
      if (e.key === 'Delete' && selectedId && !e.target.closest('[contenteditable]')) {
        removeBlock(selectedId)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  // InteractJS setup
  useEffect(() => {
    if (readOnly) return

    const snap = interact.modifiers.snap({
      targets: [interact.snappers.grid({ x: GRID, y: GRID })],
      range: GRID,
      relativePoints: [{ x: 0, y: 0 }]
    })

    interact('.layout-block').draggable({
      inertia: false,
      modifiers: [
        snap,
        interact.modifiers.restrictRect({ restriction: 'parent', endOnly: false })
      ],
      listeners: {
        move(event) {
          const el = event.target
          const x = (parseFloat(el.dataset.x) || 0) + event.dx
          const y = (parseFloat(el.dataset.y) || 0) + event.dy
          el.style.transform = `translate(${x}px, ${y}px)`
          el.dataset.x = x
          el.dataset.y = y
        },
        end(event) {
          const el = event.target
          const id = el.dataset.blockId
          const dx = parseFloat(el.dataset.x) || 0
          const dy = parseFloat(el.dataset.y) || 0
          setBlocks(prev => {
            const updated = prev.map(b => b.id === id ? { ...b, x: Math.round(b.x + dx), y: Math.round(b.y + dy) } : b)
            pushHistory(updated)
            return updated
          })
          el.style.transform = ''
          el.dataset.x = 0
          el.dataset.y = 0
        }
      }
    }).resizable({
      edges: { left: false, right: true, bottom: true, top: false },
      modifiers: [
        snap,
        interact.modifiers.restrictSize({ min: { width: 50, height: 20 } })
      ],
      listeners: {
        move(event) {
          const el = event.target
          el.style.width = `${event.rect.width}px`
          el.style.height = `${event.rect.height}px`
        },
        end(event) {
          const el = event.target
          const id = el.dataset.blockId
          setBlocks(prev => {
            const updated = prev.map(b => b.id === id ? { ...b, w: Math.round(event.rect.width), h: Math.round(event.rect.height) } : b)
            pushHistory(updated)
            return updated
          })
        }
      }
    })

    return () => { interact('.layout-block').unset() }
  }, [readOnly])

  const addBlock = (type) => {
    const id = `block-${++blockCounter}`
    const defaults = {
      title: { content: '<b>TITRE</b>', w: 400, h: 40 },
      text: { content: 'Nouveau texte...', w: 350, h: 80 },
      document: { content: '', w: 280, h: 100, docRef: null },
      signature: { content: '', w: 250, h: 70 },
      stamp: { content: '', w: 180, h: 100 },
      image: { content: '', w: 200, h: 200 },
      separator: { content: '', w: 600, h: 4 },
    }
    const d = defaults[type] || defaults.text
    const newBlock = { id, type, content: d.content, x: 50, y: 50 + blocks.length * 30, w: d.w, h: d.h }
    if (type === 'document') newBlock.docRef = null
    const newBlocks = [...blocks, newBlock]
    setBlocks(newBlocks)
    pushHistory(newBlocks)
    setSelectedId(id)
    if (type === 'document') setShowDocPicker(id)
  }

  const removeBlock = (id) => {
    const newBlocks = blocks.filter(b => b.id !== id)
    setBlocks(newBlocks)
    pushHistory(newBlocks)
    if (selectedId === id) setSelectedId(null)
  }

  const duplicateBlock = (id) => {
    const src = blocks.find(b => b.id === id)
    if (!src) return
    const newId = `block-${++blockCounter}`
    const newBlocks = [...blocks, { ...src, id: newId, x: src.x + 20, y: src.y + 20 }]
    setBlocks(newBlocks)
    pushHistory(newBlocks)
    setSelectedId(newId)
  }

  const moveLayer = (id, dir) => {
    const idx = blocks.findIndex(b => b.id === id)
    if (idx < 0) return
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= blocks.length) return
    const newBlocks = [...blocks]
    ;[newBlocks[idx], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[idx]]
    setBlocks(newBlocks)
    pushHistory(newBlocks)
  }

  const updateContent = (id, content) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b))
  }

  const handleSave = () => { if (onSave) onSave(blocks) }

  const handlePublish = () => {
    if (!onPublish || !canvasRef.current) return
    const clone = canvasRef.current.cloneNode(true)
    clone.querySelectorAll('.block-tools, .block-resize-handle').forEach(el => el.remove())
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'))
    clone.querySelectorAll('.layout-block').forEach(el => {
      el.classList.remove('layout-block', 'selected')
      el.style.cursor = 'default'
      el.style.outline = 'none'
      el.removeAttribute('data-block-id')
      el.removeAttribute('data-x')
      el.removeAttribute('data-y')
    })
    onPublish(clone.innerHTML)
  }

  const handleImageUpload = (blockId) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => updateContent(blockId, ev.target.result)
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const handleSignatureDone = (dataUrl) => {
    if (showSignatureModal && dataUrl) {
      updateContent(showSignatureModal, dataUrl)
      pushHistory(blocks.map(b => b.id === showSignatureModal ? { ...b, content: dataUrl } : b))
    }
    setShowSignatureModal(null)
  }

  const selectedBlock = blocks.find(b => b.id === selectedId)

  return (
    <div className="layout-editor">
      {/* Toolbar */}
      {!readOnly && (
        <div className="layout-toolbar">
          <div className="layout-toolbar-title">{title}</div>
          <div className="layout-toolbar-blocks">
            {BLOCK_TYPES.map(bt => (
              <button key={bt.type} className="toolbar-btn" onClick={() => addBlock(bt.type)} title={bt.label}>
                {bt.icon} <span className="toolbar-btn-label">{bt.label}</span>
              </button>
            ))}
          </div>
          <div className="layout-toolbar-sep" />
          <div className="layout-toolbar-actions">
            <button className="toolbar-btn" onClick={undo} disabled={historyIdx <= 0} title="Annuler (Ctrl+Z)">↩️</button>
            <button className="toolbar-btn" onClick={redo} disabled={historyIdx >= history.length - 1} title="Rétablir (Ctrl+Y)">↪️</button>
            {onSave && <button className="btn btn-secondary btn-small" onClick={handleSave}>💾 Sauvegarder</button>}
            {onPublish && <button className="btn btn-primary btn-small" onClick={handlePublish}>📜 Publier</button>}
          </div>
        </div>
      )}

      {msg && <div className="layout-msg">{msg}</div>}

      {/* Canvas */}
      <div className="layout-canvas-wrapper">
        <div
          ref={canvasRef}
          className="layout-canvas"
          style={{ width, minHeight: height }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null) }}
        >
          {blocks.map((block, zIdx) => (
            <div
              key={block.id}
              className={`layout-block ${selectedId === block.id ? 'selected' : ''} block-${block.type}`}
              data-block-id={block.id}
              style={{
                position: 'absolute',
                left: block.x,
                top: block.y,
                width: block.w,
                height: block.type === 'separator' ? 4 : block.h,
                zIndex: selectedId === block.id ? 100 : zIdx + 1,
              }}
              onClick={(e) => { e.stopPropagation(); setSelectedId(block.id) }}
            >
              {/* Block tools */}
              {!readOnly && selectedId === block.id && (
                <div className="block-tools">
                  <span className="block-type-label">{block.type}</span>
                  {block.type === 'document' && <button onClick={() => setShowDocPicker(block.id)} title="Changer document">📎</button>}
                  {block.type === 'image' && <button onClick={() => handleImageUpload(block.id)} title="Image">🖼️</button>}
                  {block.type === 'stamp' && <button onClick={() => handleImageUpload(block.id)} title="Tampon (image)">🔏</button>}
                  {block.type === 'signature' && <button onClick={() => setShowSignatureModal(block.id)} title="Dessiner">✍️</button>}
                  <button onClick={() => duplicateBlock(block.id)} title="Dupliquer">📋</button>
                  <button onClick={() => moveLayer(block.id, 1)} title="Avancer">⬆</button>
                  <button onClick={() => moveLayer(block.id, -1)} title="Reculer">⬇</button>
                  <button onClick={() => removeBlock(block.id)} title="Supprimer" style={{ color: '#ff6b6b' }}>✕</button>
                </div>
              )}

              {/* Content */}
              {block.type === 'separator' ? (
                <div className="block-separator" />
              ) : block.type === 'document' ? (
                block.docRef ? (
                  <div className="block-document-card" onClick={() => !readOnly ? setShowDocPicker(block.id) : block.docRef.url && window.open(block.docRef.url, '_blank')}>
                    <div className="block-doc-pin">📎</div>
                    <div className="block-doc-info">
                      <div className="block-doc-label">{block.docRef.label}</div>
                      {block.docRef.sub && <div className="block-doc-sub">{block.docRef.sub}</div>}
                      <div className="block-doc-cat">{block.docRef.category}</div>
                    </div>
                  </div>
                ) : (
                  <div className="block-placeholder" onClick={() => !readOnly && setShowDocPicker(block.id)}>📎 Épingler un document</div>
                )
              ) : block.type === 'image' || block.type === 'stamp' ? (
                block.content ? (
                  <img src={block.content} alt="" className={block.type === 'stamp' ? 'block-stamp' : 'block-image'} />
                ) : (
                  <div className="block-placeholder" onClick={() => handleImageUpload(block.id)}>
                    {block.type === 'stamp' ? '🔏 Cliquer pour ajouter' : '🖼️ Cliquer pour ajouter'}
                  </div>
                )
              ) : block.type === 'signature' ? (
                block.content ? (
                  <img src={block.content} alt="Signature" className="block-signature-img" onClick={() => !readOnly && setShowSignatureModal(block.id)} />
                ) : (
                  <div className="block-placeholder" onClick={() => !readOnly && setShowSignatureModal(block.id)}>✍️ Cliquer pour signer</div>
                )
              ) : (
                <div
                  className={`block-content ${block.type === 'title' ? 'block-title-content' : ''}`}
                  contentEditable={!readOnly}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newContent = e.currentTarget.innerHTML
                    updateContent(block.id, newContent)
                    pushHistory(blocks.map(b => b.id === block.id ? { ...b, content: newContent } : b))
                  }}
                  dangerouslySetInnerHTML={{ __html: block.content }}
                />
              )}

              {/* Resize handle */}
              {!readOnly && <div className="block-resize-handle" />}
            </div>
          ))}

          {blocks.length === 0 && !readOnly && (
            <div className="layout-empty">
              <p>📄 Canvas vide</p>
              <p style={{ fontSize: '0.8rem' }}>Utilisez la barre d'outils pour ajouter des blocs</p>
              <p style={{ fontSize: '0.7rem', opacity: 0.5 }}>Ctrl+Z = Annuler • Delete = Supprimer bloc • Glisser = Déplacer</p>
            </div>
          )}
        </div>
      </div>

      {/* Signature modal */}
      {showSignatureModal && (
        <div className="layout-modal-overlay" onClick={() => setShowSignatureModal(null)}>
          <div className="layout-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem' }}>✍️ Dessiner la signature</h3>
            <SignatureCanvas onDone={handleSignatureDone} onCancel={() => setShowSignatureModal(null)} />
          </div>
        </div>
      )}

      {/* Document picker modal */}
      {showDocPicker && (
        <div className="layout-modal-overlay" onClick={() => setShowDocPicker(null)}>
          <div className="layout-modal layout-modal-wide" onClick={e => e.stopPropagation()}>
            <DocumentPicker
              affaireId={affaireId}
              onSelect={(docRef) => {
                const targetId = showDocPicker
                const updated = blocks.map(b => b.id === targetId ? { ...b, docRef, content: docRef.label } : b)
                setBlocks(updated)
                pushHistory(updated)
                setShowDocPicker(null)
              }}
              onClose={() => setShowDocPicker(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Document Picker Component ─── */
function DocumentPicker({ affaireId, onSelect, onClose }) {
  const [category, setCategory] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const loadCategory = async (cat) => {
    setCategory(cat)
    setItems([])
    setSearch('')
    setLoading(true)
    try {
      if (cat.key === 'piece' && affaireId) {
        const res = await apiClient.get(`/affaires/${affaireId}`)
        setItems((res.data.pieces || []).map(p => ({
          id: p.id, label: `${p.titre}`, sub: `${p.type} — ${p.date_rp || ''}`, badge: p.type, url: `/sanctions/${affaireId}`
        })))
      } else if (cat.endpoint) {
        const res = await apiClient.get(cat.endpoint)
        // API returns { success, data: [...] }
        const raw = res.data?.data || res.data || []
        const data = Array.isArray(raw) ? raw : []
        setItems(data.map(cat.mapFn).slice(0, 100))
      }
    } catch (err) {
      console.error('Doc picker load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = items.filter(it =>
    !search || `${it.label} ${it.sub}`.toLowerCase().includes(search.toLowerCase())
  )

  const categories = DOC_CATEGORIES.filter(c => c.key !== 'piece' || affaireId)

  return (
    <div className="doc-picker">
      <div className="doc-picker-header">
        <h3>📎 Épingler un document</h3>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {!category ? (
        <div className="doc-picker-categories">
          <p className="doc-picker-hint">Choisissez le type de document à épingler :</p>
          {categories.map(cat => (
            <button key={cat.key} className="doc-picker-cat-btn" onClick={() => loadCategory(cat)}>
              <span className="doc-cat-icon">{cat.icon}</span>
              <span className="doc-cat-label">{cat.label.replace(/^[^\s]+\s/, '')}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="doc-picker-nav">
            <button className="btn btn-sm btn-secondary" onClick={() => { setCategory(null); setItems([]) }}>← Retour</button>
            <span className="doc-picker-cat-title">{category.label}</span>
            <span className="doc-picker-count">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <input
            className="form-input doc-picker-search"
            placeholder="🔍 Filtrer par nom, titre, auteur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {loading ? (
            <p className="doc-picker-loading">Chargement...</p>
          ) : filtered.length === 0 ? (
            <p className="doc-picker-empty">Aucun document trouvé</p>
          ) : (
            <div className="doc-picker-list">
              {filtered.map(item => (
                <button
                  key={item.id}
                  className="doc-picker-item"
                  onClick={() => onSelect({ ...item, category: category.label })}
                >
                  <div className="doc-picker-item-top">
                    <span className="doc-picker-item-label">{item.label}</span>
                    {item.badge && <span className="doc-picker-item-badge">{item.badge}</span>}
                  </div>
                  {item.sub && <div className="doc-picker-item-sub">{item.sub}</div>}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
