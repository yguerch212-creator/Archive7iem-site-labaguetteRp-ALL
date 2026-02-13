import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import interact from 'interactjs'
import './dossiers.css'

const GRID = 5

export default function DossierLayout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dossier, setDossier] = useState(null)
  const [entrees, setEntrees] = useState([])
  const [pages, setPages] = useState({}) // { 'cover': [...blocks], 'page-1': [...blocks], ... }
  const [currentPage, setCurrentPage] = useState('cover')
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
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

      const layoutData = lRes.data
      if (layoutData?.pages) {
        setPages(layoutData.pages)
      } else {
        // Generate default pages from entries
        setPages(generateDefaultPages(d.dossier, d.entrees || []))
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const generateDefaultPages = (dos, entries) => {
    const p = {}

    // Cover page
    p['cover'] = [
      { id: 'cover-stamp', type: 'text', content: 'GEHEIM', x: 280, y: 20, w: 200, h: 30, style: 'stamp' },
      { id: 'cover-emblem', type: 'text', content: '✠', x: 310, y: 80, w: 100, h: 80, style: 'emblem' },
      { id: 'cover-title', type: 'text', content: dos.titre || 'DOSSIER', x: 80, y: 180, w: 560, h: 50, style: 'title' },
      { id: 'cover-desc', type: 'text', content: dos.description || '', x: 120, y: 240, w: 480, h: 30, style: 'subtitle' },
      { id: 'cover-type', type: 'text', content: `${dos.type || '—'} · ${entries.length} entrée${entries.length !== 1 ? 's' : ''}`, x: 180, y: 290, w: 360, h: 25, style: 'meta' },
      { id: 'cover-footer', type: 'text', content: 'Archives du 7e Armeekorps', x: 200, y: 480, w: 320, h: 25, style: 'footer' },
    ]

    // One page per entry
    entries.forEach((e, i) => {
      const key = `page-${i + 1}`
      p[key] = [
        { id: `${key}-num`, type: 'text', content: `N° ${i + 1}`, x: 30, y: 15, w: 60, h: 20, style: 'page-num' },
        { id: `${key}-date`, type: 'text', content: e.date_rp || '', x: 500, y: 15, w: 200, h: 20, style: 'date' },
        { id: `${key}-title`, type: 'text', content: e.titre || `Entrée ${i + 1}`, x: 40, y: 50, w: 640, h: 35, style: 'entry-title' },
        { id: `${key}-content`, type: 'text', content: e.contenu || '', x: 40, y: 95, w: 640, h: 350, style: 'entry-content' },
        { id: `${key}-author`, type: 'text', content: `Par ${e.created_by_nom || '—'}`, x: 40, y: 470, w: 300, h: 20, style: 'author' },
      ]
    })

    return p
  }

  // InteractJS for current page blocks
  useEffect(() => {
    if (!canvasRef.current) return
    const snap = interact.modifiers.snap({
      targets: [interact.snappers.grid({ x: GRID, y: GRID })],
      range: GRID,
      relativePoints: [{ x: 0, y: 0 }]
    })

    interact('.book-block').draggable({
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
          const bid = el.dataset.blockId
          const dx = parseFloat(el.dataset.x) || 0
          const dy = parseFloat(el.dataset.y) || 0
          updateBlock(bid, b => ({ ...b, x: Math.round(b.x + dx), y: Math.round(b.y + dy) }))
          el.style.transform = ''
          el.dataset.x = 0
          el.dataset.y = 0
        }
      }
    }).resizable({
      edges: { right: true, bottom: true, left: false, top: false },
      modifiers: [
        snap,
        interact.modifiers.restrictSize({ min: { width: 40, height: 15 } })
      ],
      listeners: {
        move(event) {
          event.target.style.width = `${event.rect.width}px`
          event.target.style.height = `${event.rect.height}px`
        },
        end(event) {
          const bid = event.target.dataset.blockId
          updateBlock(bid, b => ({ ...b, w: Math.round(event.rect.width), h: Math.round(event.rect.height) }))
        }
      }
    })

    return () => { interact('.book-block').unset() }
  }, [currentPage])

  const updateBlock = (blockId, fn) => {
    setPages(prev => {
      const pageBlocks = (prev[currentPage] || []).map(b => b.id === blockId ? fn(b) : b)
      return { ...prev, [currentPage]: pageBlocks }
    })
  }

  const updateBlockContent = (blockId, content) => {
    updateBlock(blockId, b => ({ ...b, content }))
  }

  const addBlock = () => {
    const newId = `block-${Date.now()}`
    setPages(prev => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), { id: newId, type: 'text', content: 'Nouveau texte...', x: 40, y: 40, w: 300, h: 60, style: 'entry-content' }]
    }))
    setSelectedBlock(newId)
  }

  const removeBlock = (blockId) => {
    setPages(prev => ({
      ...prev,
      [currentPage]: (prev[currentPage] || []).filter(b => b.id !== blockId)
    }))
    if (selectedBlock === blockId) setSelectedBlock(null)
  }

  const addPage = () => {
    const pageNums = Object.keys(pages).filter(k => k.startsWith('page-')).map(k => parseInt(k.split('-')[1]))
    const next = Math.max(0, ...pageNums) + 1
    const key = `page-${next}`
    setPages(prev => ({
      ...prev,
      [key]: [
        { id: `${key}-num`, type: 'text', content: `N° ${next}`, x: 30, y: 15, w: 60, h: 20, style: 'page-num' },
        { id: `${key}-title`, type: 'text', content: 'Nouvelle page', x: 40, y: 50, w: 640, h: 35, style: 'entry-title' },
        { id: `${key}-content`, type: 'text', content: '', x: 40, y: 95, w: 640, h: 350, style: 'entry-content' },
      ]
    }))
    setCurrentPage(key)
  }

  const deletePage = () => {
    if (currentPage === 'cover') return
    if (!confirm('Supprimer cette page ?')) return
    setPages(prev => {
      const next = { ...prev }
      delete next[currentPage]
      return next
    })
    setCurrentPage('cover')
  }

  const handleSave = async () => {
    try {
      await api.put(`/dossiers/${id}/layout`, { pages })
      setMessage('💾 Sauvegardé !')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Save error:', err)
      setMessage('❌ Erreur de sauvegarde')
    }
  }

  const handlePublish = async () => {
    try {
      // Generate HTML from all pages for the book view
      await api.put(`/dossiers/${id}/layout`, { pages, published: true })
      setMessage('📜 Carnet publié ! Redirection...')
      setTimeout(() => navigate(`/dossiers/${id}`), 1500)
    } catch (err) {
      console.error('Publish error:', err)
      setMessage('❌ Erreur de publication')
    }
  }

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>

  const pageKeys = ['cover', ...Object.keys(pages).filter(k => k !== 'cover').sort((a, b) => {
    const na = parseInt(a.split('-')[1]) || 0
    const nb = parseInt(b.split('-')[1]) || 0
    return na - nb
  })]

  const currentBlocks = pages[currentPage] || []
  const currentPageIdx = pageKeys.indexOf(currentPage)

  const STYLE_MAP = {
    'stamp': { color: 'rgba(180,40,40,0.5)', fontWeight: '900', letterSpacing: '3px', textAlign: 'center', fontSize: '1.2rem' },
    'emblem': { textAlign: 'center', fontSize: '3rem', lineHeight: '1' },
    'title': { fontWeight: '800', fontSize: '1.4rem', textAlign: 'center', borderBottom: '2px solid #8a7a5a' },
    'subtitle': { textAlign: 'center', fontStyle: 'italic', color: '#555', fontSize: '0.85rem' },
    'meta': { textAlign: 'center', color: '#777', fontSize: '0.75rem' },
    'footer': { textAlign: 'center', color: '#8a7a5a', fontSize: '0.75rem', borderTop: '1px solid #ccc', paddingTop: '4px' },
    'page-num': { fontWeight: '700', fontSize: '0.7rem', color: '#999' },
    'date': { textAlign: 'right', fontSize: '0.75rem', color: '#666', fontStyle: 'italic' },
    'entry-title': { fontWeight: '700', fontSize: '1.1rem', borderBottom: '1px solid #b8a88a', paddingBottom: '4px' },
    'entry-content': { fontSize: '0.82rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' },
    'author': { fontSize: '0.7rem', color: '#888', fontStyle: 'italic' },
  }

  return (
    <div className="dossier-layout-page">
      <div className="dossier-layout-header">
        <BackButton label="← Retour au dossier" />
        <h2 className="dossier-layout-title">🖋️ Mise en page — {dossier?.titre || 'Dossier'}</h2>
        <div className="dossier-layout-actions">
          <button className="btn btn-secondary btn-small" onClick={handleSave}>💾 Sauvegarder</button>
          <button className="btn btn-primary btn-small" onClick={handlePublish}>📜 Publier</button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes('❌') ? 'alert-danger' : 'alert-success'}`} style={{ textAlign: 'center', fontWeight: 600 }}>
          {message}
        </div>
      )}

      {/* Page navigation - book style */}
      <div className="dossier-layout-nav">
        <button className="book-nav-btn" disabled={currentPageIdx <= 0} onClick={() => setCurrentPage(pageKeys[currentPageIdx - 1])}>◀</button>
        <div className="dossier-page-tabs">
          {pageKeys.map((key, i) => (
            <button
              key={key}
              className={`dossier-page-tab ${currentPage === key ? 'active' : ''}`}
              onClick={() => setCurrentPage(key)}
            >
              {key === 'cover' ? '📔 Couverture' : `📄 ${i}`}
            </button>
          ))}
          <button className="dossier-page-tab dossier-page-add" onClick={addPage}>+ Page</button>
        </div>
        <button className="book-nav-btn" disabled={currentPageIdx >= pageKeys.length - 1} onClick={() => setCurrentPage(pageKeys[currentPageIdx + 1])}>▶</button>
      </div>

      {/* Page toolbar */}
      <div className="dossier-block-toolbar">
        <button className="btn btn-sm btn-secondary" onClick={addBlock}>+ Bloc texte</button>
        {currentPage !== 'cover' && (
          <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={deletePage}>🗑️ Supprimer la page</button>
        )}
        <span className="dossier-toolbar-hint">Glissez pour déplacer · Bord droit/bas pour redimensionner · Cliquez pour éditer</span>
      </div>

      {/* The book page canvas */}
      <div className="dossier-book-editor">
        <div
          ref={canvasRef}
          className={`dossier-book-page ${currentPage === 'cover' ? 'is-cover' : ''}`}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedBlock(null) }}
        >
          {currentBlocks.map((block, zIdx) => (
            <div
              key={block.id}
              className={`book-block ${selectedBlock === block.id ? 'selected' : ''}`}
              data-block-id={block.id}
              style={{
                position: 'absolute',
                left: block.x,
                top: block.y,
                width: block.w,
                height: block.h,
                zIndex: selectedBlock === block.id ? 100 : zIdx + 1,
                ...STYLE_MAP[block.style] || {},
              }}
              onClick={(e) => { e.stopPropagation(); setSelectedBlock(block.id) }}
            >
              {/* Block tools */}
              {selectedBlock === block.id && (
                <div className="book-block-tools">
                  <select
                    className="book-block-style-select"
                    value={block.style || 'entry-content'}
                    onChange={e => updateBlock(block.id, b => ({ ...b, style: e.target.value }))}
                  >
                    <option value="title">Titre</option>
                    <option value="subtitle">Sous-titre</option>
                    <option value="entry-title">En-tête</option>
                    <option value="entry-content">Texte</option>
                    <option value="stamp">Tampon</option>
                    <option value="meta">Méta</option>
                    <option value="date">Date</option>
                    <option value="author">Auteur</option>
                    <option value="footer">Pied de page</option>
                    <option value="page-num">N° page</option>
                    <option value="emblem">Emblème</option>
                  </select>
                  <button onClick={() => removeBlock(block.id)} title="Supprimer" style={{ color: '#ff6b6b' }}>✕</button>
                </div>
              )}

              <div
                className="book-block-content"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateBlockContent(block.id, e.currentTarget.innerText)}
                dangerouslySetInnerHTML={{ __html: block.content }}
              />

              <div className="book-block-resize" />
            </div>
          ))}

          {currentBlocks.length === 0 && (
            <div className="dossier-empty-page">
              Page vide — cliquez "+ Bloc texte" pour ajouter du contenu
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
