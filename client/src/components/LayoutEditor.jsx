import { useState, useEffect, useRef, useCallback } from 'react'
import interact from 'interactjs'
import './layout-editor.css'

/**
 * LayoutEditor — Drag & drop + resize block editor (Canva-style)
 * 
 * Props:
 *  - blocks: array of { id, type, content, x, y, w, h, style? }
 *  - onSave(blocks): called when user saves
 *  - onPublish(html): called when user publishes (flattened HTML)
 *  - title: editor title
 *  - width/height: canvas dimensions (default 800x1100)
 *  - readOnly: disable editing
 */

const BLOCK_TYPES = [
  { type: 'title', label: '📌 Titre', icon: '📌' },
  { type: 'text', label: '📝 Texte', icon: '📝' },
  { type: 'signature', label: '✍️ Signature', icon: '✍️' },
  { type: 'stamp', label: '🔏 Tampon', icon: '🔏' },
  { type: 'image', label: '🖼️ Image', icon: '🖼️' },
  { type: 'separator', label: '━━ Séparateur', icon: '━' },
]

let blockCounter = 100

export default function LayoutEditor({ blocks: initialBlocks = [], onSave, onPublish, title = 'Éditeur de mise en page', width = 800, height = 1100, readOnly = false }) {
  const [blocks, setBlocks] = useState(initialBlocks)
  const [selectedId, setSelectedId] = useState(null)
  const [showToolbar, setShowToolbar] = useState(true)
  const canvasRef = useRef(null)
  const blocksRef = useRef(blocks)

  // Keep ref in sync
  useEffect(() => { blocksRef.current = blocks }, [blocks])

  // Setup InteractJS
  useEffect(() => {
    if (readOnly) return

    interact('.layout-block').draggable({
      inertia: false,
      modifiers: [
        interact.modifiers.restrictRect({ restriction: 'parent', endOnly: false })
      ],
      listeners: {
        move(event) {
          const el = event.target
          const id = el.dataset.blockId
          const x = (parseFloat(el.dataset.x) || 0) + event.dx
          const y = (parseFloat(el.dataset.y) || 0) + event.dy
          el.style.transform = `translate(${x}px, ${y}px)`
          el.dataset.x = x
          el.dataset.y = y
        },
        end(event) {
          const el = event.target
          const id = el.dataset.blockId
          const x = parseFloat(el.dataset.x) || 0
          const y = parseFloat(el.dataset.y) || 0
          // Update block position
          setBlocks(prev => prev.map(b => b.id === id ? { ...b, x: Math.round(parseFloat(b.x) + x), y: Math.round(parseFloat(b.y) + y) } : b))
          el.style.transform = ''
          el.dataset.x = 0
          el.dataset.y = 0
        }
      }
    }).resizable({
      edges: { left: false, right: true, bottom: true, top: false },
      modifiers: [
        interact.modifiers.restrictSize({ min: { width: 60, height: 30 } })
      ],
      listeners: {
        move(event) {
          const el = event.target
          const id = el.dataset.blockId
          el.style.width = `${event.rect.width}px`
          el.style.height = `${event.rect.height}px`
        },
        end(event) {
          const el = event.target
          const id = el.dataset.blockId
          setBlocks(prev => prev.map(b => b.id === id ? { ...b, w: Math.round(event.rect.width), h: Math.round(event.rect.height) } : b))
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
      signature: { content: 'Nom Prénom — Grade', w: 250, h: 60 },
      stamp: { content: '', w: 180, h: 100 },
      image: { content: '', w: 200, h: 200 },
      separator: { content: '', w: 600, h: 4 },
    }
    const d = defaults[type] || defaults.text
    setBlocks(prev => [...prev, { id, type, content: d.content, x: 50, y: 50 + prev.length * 30, w: d.w, h: d.h }])
  }

  const removeBlock = (id) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const updateContent = (id, content) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b))
  }

  const handleSave = () => {
    if (onSave) onSave(blocks)
  }

  const handlePublish = () => {
    if (!onPublish) return
    // Generate clean HTML from canvas
    const canvas = canvasRef.current
    if (!canvas) return
    // Clone and clean
    const clone = canvas.cloneNode(true)
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
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        updateContent(blockId, ev.target.result)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const handleStampSelect = (blockId) => {
    const stamps = [
      { id: 'tempon916', label: '916. Grenadier', url: '/assets/stamps/tempon916.png' },
    ]
    // For now, use first stamp or prompt
    if (stamps.length > 0) {
      updateContent(blockId, stamps[0].url)
    }
  }

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
          <div className="layout-toolbar-actions">
            {onSave && <button className="btn btn-secondary btn-small" onClick={handleSave}>💾 Sauvegarder</button>}
            {onPublish && <button className="btn btn-primary btn-small" onClick={handlePublish}>📜 Publier</button>}
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="layout-canvas-wrapper">
        <div
          ref={canvasRef}
          className="layout-canvas"
          style={{ width, minHeight: height }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null) }}
        >
          {blocks.map(block => (
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
              }}
              onClick={(e) => { e.stopPropagation(); setSelectedId(block.id) }}
            >
              {/* Block tools */}
              {!readOnly && selectedId === block.id && (
                <div className="block-tools">
                  <span className="block-type-label">{block.type}</span>
                  {block.type === 'image' && <button onClick={() => handleImageUpload(block.id)} title="Charger image">🖼️</button>}
                  {block.type === 'stamp' && <button onClick={() => handleStampSelect(block.id)} title="Choisir tampon">🔏</button>}
                  <button onClick={() => removeBlock(block.id)} title="Supprimer">✕</button>
                </div>
              )}

              {/* Content */}
              {block.type === 'separator' ? (
                <div className="block-separator" />
              ) : block.type === 'image' ? (
                block.content ? (
                  <img src={block.content} alt="" className="block-image" />
                ) : (
                  <div className="block-placeholder" onClick={() => handleImageUpload(block.id)}>🖼️ Cliquer pour ajouter une image</div>
                )
              ) : block.type === 'stamp' ? (
                block.content ? (
                  <img src={block.content} alt="Tampon" className="block-stamp" />
                ) : (
                  <div className="block-placeholder" onClick={() => handleStampSelect(block.id)}>🔏 Cliquer pour choisir un tampon</div>
                )
              ) : (
                <div
                  className={`block-content ${block.type === 'title' ? 'block-title-content' : ''} ${block.type === 'signature' ? 'block-signature-content' : ''}`}
                  contentEditable={!readOnly}
                  suppressContentEditableWarning
                  onBlur={(e) => updateContent(block.id, e.currentTarget.innerHTML)}
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
