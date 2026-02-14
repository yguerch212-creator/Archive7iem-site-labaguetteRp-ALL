import DOMPurify from 'dompurify'
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import SignatureCanvas from '../../components/SignatureCanvas'
import interact from 'interactjs'
import { formatDate } from '../../utils/dates'
import './dossiers.css'

const GRID = 5

const BLOCK_TYPES = [
  { type: 'text', label: '📝 Texte', icon: '📝' },
  { type: 'title', label: '📌 Titre', icon: '📌' },
  { type: 'image', label: '🖼️ Image', icon: '🖼️' },
  { type: 'signature', label: '✍️ Signature', icon: '✍️' },
  { type: 'stamp', label: '🔏 Tampon', icon: '🔏' },
  { type: 'separator', label: '━ Séparateur', icon: '━' },
]

const CSS_STYLES = [
  { value: '', label: 'Standard' },
  { value: 'book-cover-title', label: 'Titre couverture' },
  { value: 'book-cover-desc', label: 'Description' },
  { value: 'book-cover-stamp', label: 'Tampon (GEHEIM)' },
  { value: 'book-cover-emblem', label: 'Emblème' },
  { value: 'book-cover-meta', label: 'Métadonnées' },
  { value: 'book-cover-footer', label: 'Pied de page' },
  { value: 'book-entry-title', label: 'Titre entrée' },
  { value: 'book-entry-content', label: 'Contenu entrée' },
  { value: 'book-entry-num', label: 'Numéro' },
  { value: 'book-entry-date', label: 'Date' },
  { value: 'book-entry-footer', label: 'Pied entrée' },
]

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
  const [showSignature, setShowSignature] = useState(null) // blockId
  const [showAddMenu, setShowAddMenu] = useState(false)
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

      setPages(generateDefaultPages(d.dossier, d.entrees || []))
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const generateDefaultPages = (dos, entries) => {
    const p = {}
    p['0'] = [
      { id: 'c-stamp', type: 'text', content: 'GEHEIM', x: 340, y: 15, w: 140, h: 25, css: 'book-cover-stamp' },
      { id: 'c-emblem', type: 'text', content: '✠', x: 250, y: 80, w: 100, h: 70, css: 'book-cover-emblem' },
      { id: 'c-title', type: 'text', content: dos.titre || 'DOSSIER', x: 60, y: 180, w: 480, h: 45, css: 'book-cover-title' },
      { id: 'c-desc', type: 'text', content: dos.description || '', x: 80, y: 240, w: 440, h: 30, css: 'book-cover-desc' },
      { id: 'c-meta', type: 'text', content: `${dos.type || '—'} · ${entries.length} entrée${entries.length !== 1 ? 's' : ''}`, x: 120, y: 290, w: 360, h: 22, css: 'book-cover-meta' },
      { id: 'c-footer', type: 'text', content: 'Archives du 7e Armeekorps', x: 140, y: 420, w: 320, h: 22, css: 'book-cover-footer' },
    ]
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

  // InteractJS
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
  const totalPages = Object.keys(pages).length || 1

  const updateBlock = (blockId, fn) => {
    setPages(prev => ({
      ...prev,
      [pageKey]: (prev[pageKey] || []).map(b => b.id === blockId ? fn(b) : b)
    }))
  }

  const addBlock = (type) => {
    const newId = `b-${Date.now()}`
    const defaults = {
      text: { content: 'Nouveau texte...', w: 300, h: 50, css: 'book-entry-content' },
      title: { content: '<b>TITRE</b>', w: 400, h: 35, css: 'book-entry-title' },
      image: { content: '', w: 200, h: 200, css: '' },
      signature: { content: '', w: 250, h: 70, css: '' },
      stamp: { content: '', w: 150, h: 100, css: '' },
      separator: { content: '', w: 500, h: 4, css: '' },
    }
    const d = defaults[type] || defaults.text
    const newBlock = { id: newId, type, content: d.content, x: 20, y: 50 + currentBlocks.length * 20, w: d.w, h: d.h, css: d.css }

    setPages(prev => ({
      ...prev,
      [pageKey]: [...(prev[pageKey] || []), newBlock]
    }))
    setSelectedBlock(newId)
    setShowAddMenu(false)

    // For image/stamp: open file picker
    if (type === 'image' || type === 'stamp') {
      setTimeout(() => {
        const input = document.createElement('input')
        input.type = 'file'; input.accept = 'image/*'
        input.onchange = (e) => {
          const file = e.target.files[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = (ev) => {
            setPages(prev => ({
              ...prev,
              [pageKey]: (prev[pageKey] || []).map(b => b.id === newId ? { ...b, content: ev.target.result } : b)
            }))
          }
          reader.readAsDataURL(file)
        }
        input.click()
      }, 100)
    }

    // For signature: open canvas
    if (type === 'signature') {
      setTimeout(() => setShowSignature(newId), 100)
    }
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

  const addPage = () => {
    const newKey = String(totalPages)
    setPages(prev => {
      const next = { ...prev, [newKey]: [] }
      return next
    })
    // Use callback to ensure we navigate after state updates
    setTimeout(() => setCurrentPage(parseInt(newKey)), 50)
    setSelectedBlock(null)
  }

  const removePage = () => {
    if (totalPages <= 1) return
    if (!confirm(`Supprimer la page ${currentPage === 0 ? 'couverture' : currentPage} ?`)) return
    setPages(prev => {
      const next = { ...prev }
      delete next[pageKey]
      // Re-index pages above
      const keys = Object.keys(next).map(Number).sort((a, b) => a - b)
      const reindexed = {}
      keys.forEach((k, i) => { reindexed[String(i)] = next[String(k)] })
      return reindexed
    })
    setCurrentPage(p => Math.max(0, p - 1))
    setSelectedBlock(null)
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Delete' && selectedBlock && !e.target.closest('[contenteditable]')) removeBlock(selectedBlock)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>

  const sel = selectedBlock ? currentBlocks.find(b => b.id === selectedBlock) : null

  return (
    <div className="dossier-detail-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <BackButton label="← Retour au dossier" />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Block type buttons */}
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary btn-small" onClick={() => setShowAddMenu(!showAddMenu)}>+ Ajouter ▾</button>
            {showAddMenu && (
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 200, background: 'var(--card-bg, #f5f2e8)', border: '1px solid var(--border-color)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', padding: '0.3rem', minWidth: 160 }}>
                {BLOCK_TYPES.map(bt => (
                  <button key={bt.type} onClick={() => addBlock(bt.type)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem', borderRadius: 4 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    {bt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-secondary btn-small" onClick={addPage}>+ Page</button>
          {totalPages > 1 && <button className="btn btn-small" style={{ color: '#c44', border: '1px solid #c44', background: 'none' }} onClick={removePage}>🗑️ Page</button>}
          <button className="btn btn-primary btn-small" onClick={handleSave}>💾 Sauvegarder</button>
        </div>
      </div>

      {message && <div className={`alert ${message.includes('❌') ? 'alert-danger' : 'alert-success'}`} style={{ textAlign: 'center', fontWeight: 600, marginBottom: '0.5rem' }}>{message}</div>}

      {/* Properties panel for selected block */}
      {sel && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', flexWrap: 'wrap', padding: '0.5rem', background: 'rgba(0,0,0,0.04)', borderRadius: 6, fontSize: '0.8rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Style :</span>
          <select value={sel.css || ''} onChange={e => updateBlock(sel.id, b => ({ ...b, css: e.target.value }))} className="form-input" style={{ maxWidth: 180, padding: '2px 6px', fontSize: '0.8rem' }}>
            {CSS_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {(sel.type === 'image' || sel.type === 'stamp') && (
            <button className="btn btn-sm btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => {
              const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'
              input.onchange = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => updateBlock(sel.id, b => ({ ...b, content: ev.target.result })); r.readAsDataURL(f) }
              input.click()
            }}>📸 Changer image</button>
          )}
          {sel.type === 'signature' && (
            <button className="btn btn-sm btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setShowSignature(sel.id)}>✍️ Dessiner</button>
          )}
        </div>
      )}

      {/* THE BOOK */}
      <div className="book-container">
        <div className="book-nav">
          <button className="book-nav-btn" onClick={prevPage} disabled={currentPage === 0}>◀</button>
          <span className="book-page-indicator">
            {currentPage === 0 ? 'Couverture' : `Page ${currentPage} / ${totalPages - 1}`}
          </span>
          <button className="book-nav-btn" onClick={nextPage} disabled={currentPage >= totalPages - 1}>▶</button>
        </div>

        <div className="book-page" ref={pageRef} style={{ position: 'relative' }}
          onClick={(e) => { if (e.target === e.currentTarget || e.target.classList.contains('book-page')) { setSelectedBlock(null); setShowAddMenu(false) } }}>

          {currentBlocks.map((block, zIdx) => (
            <div
              key={block.id}
              className={`edit-block ${selectedBlock === block.id ? 'edit-block-selected' : ''}`}
              data-block-id={block.id}
              style={{
                position: 'absolute',
                left: block.x, top: block.y, width: block.w, height: block.h,
                zIndex: selectedBlock === block.id ? 100 : zIdx + 1,
              }}
              onClick={(e) => { e.stopPropagation(); setSelectedBlock(block.id); setShowAddMenu(false) }}
            >
              {selectedBlock === block.id && (
                <div className="edit-block-tools">
                  <button onClick={() => duplicateBlock(block.id)} title="Dupliquer">📋</button>
                  <button onClick={() => removeBlock(block.id)} title="Supprimer" style={{ color: '#e44' }}>✕</button>
                </div>
              )}

              {/* Block rendering by type */}
              {(block.type === 'text' || block.type === 'title') && (
                <div
                  className={block.css || ''}
                  contentEditable
                  suppressContentEditableWarning
                  style={{ width: '100%', height: '100%', outline: 'none', overflow: 'hidden', margin: 0, padding: 0, position: 'static', border: 'none', transform: 'none' }}
                  onBlur={(e) => updateBlock(block.id, b => ({ ...b, content: e.currentTarget.innerHTML }))}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }}
                />
              )}

              {(block.type === 'image' || block.type === 'stamp') && (
                block.content ? (
                  <img src={block.content} alt="" style={{ width: '100%', height: '100%', objectFit: block.type === 'stamp' ? 'contain' : 'cover', opacity: block.type === 'stamp' ? 0.7 : 1, borderRadius: block.type === 'image' ? 4 : 0 }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.04)', border: '1px dashed #999', borderRadius: 4, fontSize: '0.75rem', color: '#999', cursor: 'pointer' }}
                    onClick={() => {
                      const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'
                      input.onchange = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => updateBlock(block.id, b => ({ ...b, content: ev.target.result })); r.readAsDataURL(f) }
                      input.click()
                    }}>
                    {block.type === 'image' ? '🖼️ Cliquer pour ajouter' : '🔏 Cliquer pour ajouter'}
                  </div>
                )
              )}

              {block.type === 'signature' && (
                block.content && block.content.startsWith('data:image') ? (
                  <img src={block.content} alt="Signature" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', borderBottom: '1px solid #333', paddingBottom: 4, fontSize: '0.85rem', cursor: 'pointer' }}
                    onClick={() => setShowSignature(block.id)}>
                    {block.content || '✍️ Cliquer pour signer'}
                  </div>
                )
              )}

              {block.type === 'separator' && (
                <hr style={{ border: 'none', borderTop: '2px solid #333', margin: 0, width: '100%' }} />
              )}

              {selectedBlock === block.id && <div className="edit-block-handle" />}
            </div>
          ))}

          {currentBlocks.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#bbb', fontStyle: 'italic' }}>
              Page vide — utilisez "+ Ajouter" pour créer du contenu
            </div>
          )}
        </div>

        <div className="book-dots">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} className={`book-dot ${currentPage === i ? 'active' : ''}`} onClick={() => { setCurrentPage(i); setSelectedBlock(null) }} />
          ))}
        </div>
      </div>

      {/* Signature modal */}
      {showSignature && (
        <div className="popup-overlay" onClick={() => setShowSignature(null)}>
          <div className="popup-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <button className="popup-close" onClick={() => setShowSignature(null)}>✕</button>
            <h3 style={{ margin: '0 0 1rem' }}>✍️ Dessiner une signature</h3>
            <SignatureCanvas
              onSave={(dataUrl) => {
                updateBlock(showSignature, b => ({ ...b, content: dataUrl }))
                setShowSignature(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
