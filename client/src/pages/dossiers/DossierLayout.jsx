import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import interact from 'interactjs'
import { formatDate } from '../../utils/dates'
import './dossiers.css'

const GRID = 5

export default function DossierLayout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dossier, setDossier] = useState(null)
  const [entrees, setEntrees] = useState([])
  const [pages, setPages] = useState({})
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const pageRef = useRef(null)

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    try {
      const dRes = await api.get(`/dossiers/${id}`)
      const d = dRes.data.data
      setDossier(d.dossier)
      setEntrees(d.entrees || [])

      try {
        const lRes = await api.get(`/dossiers/${id}/layout`)
        if (lRes.data?.pages) {
          setPages(lRes.data.pages)
          setLoading(false)
          return
        }
      } catch {}

      // Generate default pages
      setPages(generateDefaultPages(d.dossier, d.entrees || []))
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const generateDefaultPages = (dos, entries) => {
    const p = {}
    // Cover (page 0)
    p['0'] = [
      { id: 'c-stamp', type: 'text', content: 'GEHEIM', x: 340, y: 15, w: 140, h: 25, css: 'book-cover-stamp' },
      { id: 'c-emblem', type: 'text', content: '✠', x: 250, y: 80, w: 100, h: 70, css: 'book-cover-emblem' },
      { id: 'c-title', type: 'text', content: dos.titre || 'DOSSIER', x: 60, y: 180, w: 480, h: 45, css: 'book-cover-title' },
      { id: 'c-desc', type: 'text', content: dos.description || '', x: 80, y: 240, w: 440, h: 30, css: 'book-cover-desc' },
      { id: 'c-meta', type: 'text', content: `${dos.type || '—'} · ${entries.length} entrée${entries.length !== 1 ? 's' : ''}`, x: 120, y: 290, w: 360, h: 22, css: 'book-cover-meta' },
      { id: 'c-footer', type: 'text', content: 'Archives du 7e Armeekorps', x: 140, y: 420, w: 320, h: 22, css: 'book-cover-footer' },
    ]
    // One page per entry
    entries.forEach((e, i) => {
      const k = String(i + 1)
      p[k] = [
        { id: `${k}-num`, type: 'text', content: `N° ${i + 1}`, x: 10, y: 8, w: 60, h: 18, css: 'book-entry-num' },
        { id: `${k}-date`, type: 'text', content: e.date_rp || formatDate(e.created_at), x: 380, y: 8, w: 180, h: 18, css: 'book-entry-date' },
        { id: `${k}-title`, type: 'text', content: e.titre || `Entrée ${i + 1}`, x: 10, y: 35, w: 560, h: 30, css: 'book-entry-title' },
        { id: `${k}-content`, type: 'text', content: e.contenu || '', x: 10, y: 75, w: 560, h: 300, css: 'book-entry-content' },
        { id: `${k}-author`, type: 'text', content: `Par ${e.created_by_nom || '—'}`, x: 10, y: 390, w: 250, h: 18, css: 'book-entry-footer' },
      ]
    })
    return p
  }

  // InteractJS on blocks inside book page
  useEffect(() => {
    if (!pageRef.current) return
    const snap = interact.modifiers.snap({ targets: [interact.snappers.grid({ x: GRID, y: GRID })], range: GRID, relativePoints: [{ x: 0, y: 0 }] })

    interact('.edit-block').draggable({
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
      modifiers: [snap, interact.modifiers.restrictSize({ min: { width: 30, height: 15 } })],
      listeners: {
        move(event) { event.target.style.width = `${event.rect.width}px`; event.target.style.height = `${event.rect.height}px` },
        end(event) { updateBlock(event.target.dataset.blockId, b => ({ ...b, w: Math.round(event.rect.width), h: Math.round(event.rect.height) })) }
      }
    })
    return () => { interact('.edit-block').unset() }
  }, [currentPage])

  const pageKey = String(currentPage)
  const currentBlocks = pages[pageKey] || []
  const totalPages = Math.max(entrees.length + 1, Object.keys(pages).length)

  const updateBlock = (blockId, fn) => {
    setPages(prev => ({
      ...prev,
      [pageKey]: (prev[pageKey] || []).map(b => b.id === blockId ? fn(b) : b)
    }))
  }

  const addBlock = () => {
    const newId = `b-${Date.now()}`
    setPages(prev => ({
      ...prev,
      [pageKey]: [...(prev[pageKey] || []), { id: newId, type: 'text', content: 'Nouveau texte', x: 20, y: 50, w: 250, h: 40, css: 'book-entry-content' }]
    }))
    setSelectedBlock(newId)
  }

  const removeBlock = (bid) => {
    setPages(prev => ({ ...prev, [pageKey]: (prev[pageKey] || []).filter(b => b.id !== bid) }))
    if (selectedBlock === bid) setSelectedBlock(null)
  }

  const duplicateBlock = (bid) => {
    const src = currentBlocks.find(b => b.id === bid)
    if (!src) return
    const newId = `b-${Date.now()}`
    setPages(prev => ({ ...prev, [pageKey]: [...(prev[pageKey] || []), { ...src, id: newId, x: src.x + 15, y: src.y + 15 }] }))
    setSelectedBlock(newId)
  }

  const handleSave = async () => {
    try {
      await api.put(`/dossiers/${id}/layout`, { pages })
      setMessage('💾 Sauvegardé !')
      setTimeout(() => setMessage(''), 3000)
    } catch { setMessage('❌ Erreur') }
  }

  const prevPage = () => { setCurrentPage(p => Math.max(0, p - 1)); setSelectedBlock(null) }
  const nextPage = () => { setCurrentPage(p => Math.min(totalPages - 1, p + 1)); setSelectedBlock(null) }

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>

  return (
    <div className="dossier-detail-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <BackButton label="← Retour au dossier" />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-sm btn-secondary" onClick={addBlock}>+ Texte</button>
          <button className="btn btn-secondary btn-small" onClick={handleSave}>💾 Sauvegarder</button>
        </div>
      </div>

      {message && <div className={`alert ${message.includes('❌') ? 'alert-danger' : 'alert-success'}`} style={{ textAlign: 'center', fontWeight: 600, marginBottom: '0.5rem' }}>{message}</div>}

      {/* THE BOOK — same as DossierView */}
      <div className="book-container">
        <div className="book-nav">
          <button className="book-nav-btn" onClick={prevPage} disabled={currentPage === 0}>◀</button>
          <span className="book-page-indicator">
            {currentPage === 0 ? 'Couverture' : `Page ${currentPage} / ${totalPages - 1}`}
          </span>
          <button className="book-nav-btn" onClick={nextPage} disabled={currentPage >= totalPages - 1}>▶</button>
        </div>

        <div className="book-page" ref={pageRef} style={{ position: 'relative' }}
          onClick={(e) => { if (e.target === e.currentTarget || e.target.classList.contains('book-page')) setSelectedBlock(null) }}>

          {/* Editable blocks */}
          {currentBlocks.map((block, zIdx) => (
            <div
              key={block.id}
              className={`edit-block ${selectedBlock === block.id ? 'edit-block-selected' : ''}`}
              data-block-id={block.id}
              style={{
                position: 'absolute',
                left: block.x,
                top: block.y,
                width: block.w,
                height: block.h,
                zIndex: selectedBlock === block.id ? 100 : zIdx + 1,
              }}
              onClick={(e) => { e.stopPropagation(); setSelectedBlock(block.id) }}
            >
              {/* Tools */}
              {selectedBlock === block.id && (
                <div className="edit-block-tools">
                  <button onClick={() => duplicateBlock(block.id)} title="Dupliquer">📋</button>
                  <button onClick={() => removeBlock(block.id)} title="Supprimer" style={{ color: '#e44' }}>✕</button>
                </div>
              )}

              <div
                className={block.css || ''}
                contentEditable
                suppressContentEditableWarning
                style={{ width: '100%', height: '100%', outline: 'none', overflow: 'hidden', margin: 0, padding: 0, position: 'static', border: 'none', transform: 'none' }}
                onBlur={(e) => updateBlock(block.id, b => ({ ...b, content: e.currentTarget.innerHTML }))}
                dangerouslySetInnerHTML={{ __html: block.content }}
              />

              {selectedBlock === block.id && <div className="edit-block-handle" />}
            </div>
          ))}

          {currentBlocks.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#bbb', fontStyle: 'italic' }}>
              Page vide — cliquez "+ Texte"
            </div>
          )}
        </div>

        <div className="book-dots">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} className={`book-dot ${currentPage === i ? 'active' : ''}`} onClick={() => { setCurrentPage(i); setSelectedBlock(null) }} />
          ))}
        </div>
      </div>
    </div>
  )
}
