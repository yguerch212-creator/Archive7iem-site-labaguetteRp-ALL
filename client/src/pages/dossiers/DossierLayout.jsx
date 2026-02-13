import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import SignatureCanvas from '../../components/SignatureCanvas'
import interact from 'interactjs'
import './dossiers.css'

const GRID = 5

const BLOCK_TYPES = [
  { type: 'text', label: 'Texte', icon: '📝', style: 'entry-content' },
  { type: 'text', label: 'Titre', icon: '📌', style: 'title' },
  { type: 'signature', label: 'Signature', icon: '✍️' },
  { type: 'stamp', label: 'Tampon', icon: '🔏' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'separator', label: 'Ligne', icon: '━' },
]

const STYLE_OPTIONS = [
  { value: 'title', label: 'Titre' },
  { value: 'subtitle', label: 'Sous-titre' },
  { value: 'entry-title', label: 'En-tête' },
  { value: 'entry-content', label: 'Texte' },
  { value: 'stamp', label: 'Tampon rouge' },
  { value: 'meta', label: 'Méta' },
  { value: 'date', label: 'Date' },
  { value: 'author', label: 'Auteur' },
  { value: 'footer', label: 'Pied de page' },
  { value: 'page-num', label: 'N° page' },
  { value: 'emblem', label: 'Emblème' },
]

const STYLE_MAP = {
  'stamp': { color: 'rgba(180,40,40,0.5)', fontWeight: '900', letterSpacing: '3px', textAlign: 'center', fontSize: '1.2rem' },
  'emblem': { textAlign: 'center', fontSize: '3rem', lineHeight: '1' },
  'title': { fontWeight: '800', fontSize: '1.4rem', textAlign: 'center', borderBottom: '2px solid #8a7a5a' },
  'subtitle': { textAlign: 'center', fontStyle: 'italic', color: '#665', fontSize: '0.85rem' },
  'meta': { textAlign: 'center', color: '#887', fontSize: '0.75rem' },
  'footer': { textAlign: 'center', color: '#8a7a5a', fontSize: '0.75rem', borderTop: '1px solid #c4b896', paddingTop: '4px' },
  'page-num': { fontWeight: '700', fontSize: '0.7rem', color: '#998' },
  'date': { textAlign: 'right', fontSize: '0.75rem', color: '#776', fontStyle: 'italic' },
  'entry-title': { fontWeight: '700', fontSize: '1.1rem', borderBottom: '1px solid #b8a88a', paddingBottom: '4px' },
  'entry-content': { fontSize: '0.82rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' },
  'author': { fontSize: '0.7rem', color: '#998', fontStyle: 'italic' },
}

export default function DossierLayout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dossier, setDossier] = useState(null)
  const [entrees, setEntrees] = useState([])
  const [pages, setPages] = useState({})
  const [currentPage, setCurrentPage] = useState('cover')
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showSignature, setShowSignature] = useState(null)
  const canvasRef = useRef(null)

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    try {
      const [dRes, lRes] = await Promise.all([
        api.get(`/dossiers/${id}`),
        api.get(`/dossiers/${id}/layout`).catch(() => ({ data: { pages: null } }))
      ])
      const d = dRes.data.data
      setDossier(d.dossier)
      setEntrees(d.entrees || [])
      if (lRes.data?.pages) {
        setPages(lRes.data.pages)
      } else {
        setPages(generateDefaultPages(d.dossier, d.entrees || []))
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const generateDefaultPages = (dos, entries) => {
    const p = {}
    p['cover'] = [
      { id: 'cover-stamp', type: 'text', content: 'GEHEIM', x: 250, y: 25, w: 220, h: 30, style: 'stamp' },
      { id: 'cover-emblem', type: 'text', content: '✠', x: 310, y: 100, w: 100, h: 80, style: 'emblem' },
      { id: 'cover-title', type: 'text', content: dos.titre || 'DOSSIER', x: 80, y: 210, w: 560, h: 50, style: 'title' },
      { id: 'cover-desc', type: 'text', content: dos.description || '', x: 120, y: 275, w: 480, h: 30, style: 'subtitle' },
      { id: 'cover-meta', type: 'text', content: `${dos.type || '—'} · ${entries.length} entrée${entries.length !== 1 ? 's' : ''}`, x: 180, y: 320, w: 360, h: 25, style: 'meta' },
      { id: 'cover-footer', type: 'text', content: 'Archives du 7e Armeekorps', x: 200, y: 490, w: 320, h: 25, style: 'footer' },
    ]
    entries.forEach((e, i) => {
      const key = `page-${i + 1}`
      p[key] = [
        { id: `${key}-num`, type: 'text', content: `N° ${i + 1}`, x: 30, y: 15, w: 60, h: 20, style: 'page-num' },
        { id: `${key}-date`, type: 'text', content: e.date_rp || '', x: 500, y: 15, w: 200, h: 20, style: 'date' },
        { id: `${key}-title`, type: 'text', content: e.titre || `Entrée ${i + 1}`, x: 40, y: 50, w: 640, h: 35, style: 'entry-title' },
        { id: `${key}-content`, type: 'text', content: e.contenu || '', x: 40, y: 100, w: 640, h: 340, style: 'entry-content' },
        { id: `${key}-author`, type: 'text', content: `Par ${e.created_by_nom || '—'}`, x: 40, y: 470, w: 300, h: 20, style: 'author' },
      ]
    })
    return p
  }

  // InteractJS
  useEffect(() => {
    if (!canvasRef.current) return
    const snap = interact.modifiers.snap({ targets: [interact.snappers.grid({ x: GRID, y: GRID })], range: GRID, relativePoints: [{ x: 0, y: 0 }] })
    interact('.book-block').draggable({
      inertia: false,
      modifiers: [snap, interact.modifiers.restrictRect({ restriction: 'parent', endOnly: false })],
      listeners: {
        move(event) {
          const el = event.target
          const x = (parseFloat(el.dataset.x) || 0) + event.dx
          const y = (parseFloat(el.dataset.y) || 0) + event.dy
          el.style.transform = `translate(${x}px, ${y}px)`
          el.dataset.x = x; el.dataset.y = y
        },
        end(event) {
          const el = event.target, bid = el.dataset.blockId
          const dx = parseFloat(el.dataset.x) || 0, dy = parseFloat(el.dataset.y) || 0
          updateBlock(bid, b => ({ ...b, x: Math.round(b.x + dx), y: Math.round(b.y + dy) }))
          el.style.transform = ''; el.dataset.x = 0; el.dataset.y = 0
        }
      }
    }).resizable({
      edges: { right: true, bottom: true, left: false, top: false },
      modifiers: [snap, interact.modifiers.restrictSize({ min: { width: 40, height: 15 } })],
      listeners: {
        move(event) { event.target.style.width = `${event.rect.width}px`; event.target.style.height = `${event.rect.height}px` },
        end(event) { updateBlock(event.target.dataset.blockId, b => ({ ...b, w: Math.round(event.rect.width), h: Math.round(event.rect.height) })) }
      }
    })
    return () => { interact('.book-block').unset() }
  }, [currentPage])

  const updateBlock = (blockId, fn) => {
    setPages(prev => ({ ...prev, [currentPage]: (prev[currentPage] || []).map(b => b.id === blockId ? fn(b) : b) }))
  }

  const addBlock = (bt) => {
    const newId = `block-${Date.now()}`
    const defaults = {
      text: { w: 300, h: 60, content: bt.label === 'Titre' ? 'TITRE' : 'Nouveau texte...' },
      signature: { w: 250, h: 70, content: '' },
      stamp: { w: 180, h: 100, content: '' },
      image: { w: 200, h: 200, content: '' },
      separator: { w: 600, h: 4, content: '' },
    }
    const d = defaults[bt.type] || defaults.text
    setPages(prev => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), { id: newId, type: bt.type, content: d.content, x: 50, y: 50, w: d.w, h: d.h, style: bt.style || 'entry-content' }]
    }))
    setSelectedBlock(newId)
  }

  const removeBlock = (blockId) => {
    setPages(prev => ({ ...prev, [currentPage]: (prev[currentPage] || []).filter(b => b.id !== blockId) }))
    if (selectedBlock === blockId) setSelectedBlock(null)
  }

  const duplicateBlock = (blockId) => {
    const src = (pages[currentPage] || []).find(b => b.id === blockId)
    if (!src) return
    const newId = `block-${Date.now()}`
    setPages(prev => ({ ...prev, [currentPage]: [...(prev[currentPage] || []), { ...src, id: newId, x: src.x + 20, y: src.y + 20 }] }))
    setSelectedBlock(newId)
  }

  const handleImageUpload = (blockId) => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => updateBlock(blockId, b => ({ ...b, content: ev.target.result }))
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const addPage = () => {
    const nums = Object.keys(pages).filter(k => k.startsWith('page-')).map(k => parseInt(k.split('-')[1]))
    const next = Math.max(0, ...nums) + 1
    const key = `page-${next}`
    setPages(prev => ({ ...prev, [key]: [
      { id: `${key}-num`, type: 'text', content: `N° ${next}`, x: 30, y: 15, w: 60, h: 20, style: 'page-num' },
      { id: `${key}-title`, type: 'text', content: 'Nouvelle page', x: 40, y: 50, w: 640, h: 35, style: 'entry-title' },
    ]}))
    setCurrentPage(key)
  }

  const deletePage = () => {
    if (currentPage === 'cover' || !confirm('Supprimer cette page ?')) return
    setPages(prev => { const n = { ...prev }; delete n[currentPage]; return n })
    setCurrentPage('cover')
  }

  const handleSave = async () => {
    try {
      await api.put(`/dossiers/${id}/layout`, { pages })
      setMessage('💾 Sauvegardé !'); setTimeout(() => setMessage(''), 3000)
    } catch { setMessage('❌ Erreur de sauvegarde') }
  }

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>

  const pageKeys = ['cover', ...Object.keys(pages).filter(k => k !== 'cover').sort((a, b) => (parseInt(a.split('-')[1]) || 0) - (parseInt(b.split('-')[1]) || 0))]
  const currentBlocks = pages[currentPage] || []
  const currentPageIdx = pageKeys.indexOf(currentPage)

  const renderBlockContent = (block) => {
    if (block.type === 'separator') return <div style={{ width: '100%', height: '100%', borderBottom: '2px solid #b8a88a' }} />
    if (block.type === 'image' || block.type === 'stamp') {
      return block.content
        ? <img src={block.content} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: block.type === 'stamp' ? 0.7 : 1 }} />
        : <div className="book-block-placeholder" onClick={() => handleImageUpload(block.id)}>{block.type === 'stamp' ? '🔏 Tampon' : '🖼️ Image'}</div>
    }
    if (block.type === 'signature') {
      return block.content
        ? <img src={block.content} alt="Signature" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onClick={() => setShowSignature(block.id)} />
        : <div className="book-block-placeholder" onClick={() => setShowSignature(block.id)}>✍️ Signer</div>
    }
    return (
      <div
        className="book-block-text"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => updateBlock(block.id, b => ({ ...b, content: e.currentTarget.innerText }))}
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
    )
  }

  return (
    <div className="dossier-layout-page">
      <div className="dossier-layout-header">
        <BackButton label="← Retour" />
        <h2 className="dossier-layout-title">🖋️ {dossier?.titre || 'Dossier'}</h2>
        <div className="dossier-layout-actions">
          <button className="btn btn-secondary btn-small" onClick={handleSave}>💾 Sauvegarder</button>
        </div>
      </div>

      {message && <div className={`alert ${message.includes('❌') ? 'alert-danger' : 'alert-success'}`} style={{ textAlign: 'center', fontWeight: 600, marginBottom: '0.5rem' }}>{message}</div>}

      {/* Toolbar with all block types */}
      <div className="dossier-block-toolbar">
        {BLOCK_TYPES.map((bt, i) => (
          <button key={i} className="toolbar-block-btn" onClick={() => addBlock(bt)} title={bt.label}>
            {bt.icon} <span>{bt.label}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {currentPage !== 'cover' && <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={deletePage}>🗑️ Page</button>}
      </div>

      {/* Page tabs */}
      <div className="dossier-layout-nav">
        <button className="book-nav-btn" disabled={currentPageIdx <= 0} onClick={() => setCurrentPage(pageKeys[currentPageIdx - 1])}>◀</button>
        <div className="dossier-page-tabs">
          {pageKeys.map((key, i) => (
            <button key={key} className={`dossier-page-tab ${currentPage === key ? 'active' : ''}`} onClick={() => setCurrentPage(key)}>
              {key === 'cover' ? '📔 Couverture' : `📄 ${i}`}
            </button>
          ))}
          <button className="dossier-page-tab dossier-page-add" onClick={addPage}>+</button>
        </div>
        <button className="book-nav-btn" disabled={currentPageIdx >= pageKeys.length - 1} onClick={() => setCurrentPage(pageKeys[currentPageIdx + 1])}>▶</button>
      </div>

      {/* Book page canvas */}
      <div className="dossier-book-editor">
        <div ref={canvasRef} className={`dossier-book-page ${currentPage === 'cover' ? 'is-cover' : ''}`}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedBlock(null) }}>

          {currentBlocks.map((block, zIdx) => (
            <div key={block.id} className={`book-block ${selectedBlock === block.id ? 'selected' : ''}`}
              data-block-id={block.id}
              style={{
                position: 'absolute', left: block.x, top: block.y, width: block.w,
                height: block.type === 'separator' ? 4 : block.h,
                zIndex: selectedBlock === block.id ? 100 : zIdx + 1,
                ...(block.type === 'text' ? (STYLE_MAP[block.style] || {}) : {}),
              }}
              onClick={(e) => { e.stopPropagation(); setSelectedBlock(block.id) }}>

              {selectedBlock === block.id && (
                <div className="book-block-tools">
                  {block.type === 'text' && (
                    <select className="book-block-style-select" value={block.style || 'entry-content'}
                      onChange={e => updateBlock(block.id, b => ({ ...b, style: e.target.value }))}>
                      {STYLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  )}
                  {(block.type === 'image' || block.type === 'stamp') && <button onClick={() => handleImageUpload(block.id)}>🖼️</button>}
                  {block.type === 'signature' && <button onClick={() => setShowSignature(block.id)}>✍️</button>}
                  <button onClick={() => duplicateBlock(block.id)} title="Dupliquer">📋</button>
                  <button onClick={() => removeBlock(block.id)} title="Supprimer" style={{ color: '#ff6b6b' }}>✕</button>
                </div>
              )}

              {renderBlockContent(block)}
              <div className="book-block-resize" />
            </div>
          ))}

          {currentBlocks.length === 0 && (
            <div className="dossier-empty-page">Page vide — utilisez la barre d'outils ci-dessus</div>
          )}
        </div>
      </div>

      {/* Signature modal */}
      {showSignature && (
        <div className="popup-overlay" onClick={() => setShowSignature(null)}>
          <div className="popup-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h3 style={{ margin: '0 0 1rem' }}>✍️ Dessiner la signature</h3>
            <SignatureCanvas
              onDone={(dataUrl) => { if (dataUrl) updateBlock(showSignature, b => ({ ...b, content: dataUrl })); setShowSignature(null) }}
              onCancel={() => setShowSignature(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
