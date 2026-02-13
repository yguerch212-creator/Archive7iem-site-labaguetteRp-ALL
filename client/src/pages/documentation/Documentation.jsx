import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'

const CATEGORIES = ['Reglement', 'Procedure', 'Formation', 'Lore', 'Outil', 'Autre']
const CAT_ICONS = { Reglement: '📜', Procedure: '📋', Formation: '🎓', Lore: '📖', Outil: '🔧', Autre: '📁' }
const CAT_LABELS = { Reglement: 'Règlements', Procedure: 'Procédures', Formation: 'Formations', Lore: 'Lore & Histoire', Outil: 'Outils', Autre: 'Autre' }

export default function Documentation() {
  const { user } = useAuth()
  const [docs, setDocs] = useState([])
  const [pending, setPending] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showFolderForm, setShowFolderForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ titre: '', description: '', url: '', categorie: 'Autre', ordre: 0, repertoire_id: '' })
  const [folderForm, setFolderForm] = useState({ titre: '', description: '', categorie: 'Autre' })
  const [message, setMessage] = useState(null)
  const [openFolders, setOpenFolders] = useState({})
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')

  const isOfficier = user?.isOfficier || user?.isAdmin
  const isSousOff = !isOfficier && ((user?.grade_rang && user.grade_rang >= 35) || user?.isRecenseur)
  const canAdd = isOfficier || isSousOff

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await api.get('/documentation', { params: isOfficier ? { all: '1' } : {} })
      setDocs(res.data.data || [])
      if (isOfficier) {
        const p = await api.get('/documentation/pending')
        setPending(p.data.data || [])
      }
    } catch (err) { console.error(err) }
  }

  const flash = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 3000) }

  const submitDoc = async (e) => {
    e.preventDefault()
    try {
      if (editId) {
        await api.put(`/documentation/${editId}`, form)
        flash('success', 'Document modifié ✓')
      } else {
        const res = await api.post('/documentation', form)
        flash('success', res.data.data?.statut === 'en_attente' ? '📩 Soumis — en attente de validation' : 'Document ajouté ✓')
      }
      setShowForm(false); setEditId(null)
      setForm({ titre: '', description: '', url: '', categorie: 'Autre', ordre: 0, repertoire_id: '' })
      load()
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur') }
  }

  const submitFolder = async (e) => {
    e.preventDefault()
    try {
      await api.post('/documentation/repertoire', folderForm)
      flash('success', 'Répertoire créé ✓')
      setShowFolderForm(false)
      setFolderForm({ titre: '', description: '', categorie: 'Autre' })
      load()
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur') }
  }

  const startEdit = (doc) => {
    setForm({ titre: doc.titre, description: doc.description || '', url: doc.url || '', categorie: doc.categorie, ordre: doc.ordre, repertoire_id: doc.repertoire_id || '' })
    setEditId(doc.id); setShowForm(true); setShowFolderForm(false)
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ?')) return
    try { await api.delete(`/documentation/${id}`); load() } catch { flash('error', 'Erreur') }
  }

  const approve = async (id, decision) => {
    try {
      await api.put(`/documentation/${id}/approve`, { decision })
      flash('success', decision === 'approuve' ? '✅ Approuvé' : '❌ Refusé')
      load()
    } catch { flash('error', 'Erreur') }
  }

  const toggleFolder = (id) => setOpenFolders(prev => ({ ...prev, [id]: !prev[id] }))

  const folders = docs.filter(d => d.is_repertoire)
  const allDocs = docs.filter(d => !d.is_repertoire)
  const looseDocs = allDocs.filter(d => !d.repertoire_id)
  const docsInFolder = (fid) => allDocs.filter(d => d.repertoire_id === fid)

  // Filter
  const matchSearch = (d) => {
    if (search && !`${d.titre} ${d.description || ''}`.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCat && d.categorie !== filterCat) return false
    return true
  }

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <BackButton label="← Tableau de bord" />
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          {isOfficier && <button className="btn btn-secondary btn-small" onClick={() => { setShowFolderForm(!showFolderForm); setShowForm(false) }}>{showFolderForm ? '✕' : '📂 Répertoire'}</button>}
          {canAdd && <button className="btn btn-primary btn-small" onClick={() => { setShowForm(!showForm); setShowFolderForm(false); setEditId(null); setForm({ titre: '', description: '', url: '', categorie: 'Autre', ordre: 0, repertoire_id: '' }) }}>{showForm ? '✕ Annuler' : '+ Document'}</button>}
        </div>
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>📚 Documentation & Règlements</h1>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '3px solid var(--warning)', padding: 'var(--space-md)' }}>
          <h3 style={{ margin: '0 0 var(--space-sm)' }}>⏳ En attente de validation ({pending.length})</h3>
          {pending.map(doc => (
            <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-xs) 0', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <strong>{doc.titre}</strong> <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>par {doc.created_by_nom}</span>
                {doc.url && <> · <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>🔗 lien</a></>}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                <button className="btn btn-sm btn-primary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => approve(doc.id, 'approuve')}>✅ Valider</button>
                <button className="btn btn-sm" style={{ padding: '4px 12px', fontSize: '0.8rem', color: 'var(--danger)' }} onClick={() => approve(doc.id, 'refuse')}>❌ Refuser</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forms */}
      {showFolderForm && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>📂 Nouveau répertoire</h3>
          <form onSubmit={submitFolder}>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
                <label className="form-label">Nom *</label>
                <input type="text" className="form-input" value={folderForm.titre} onChange={e => setFolderForm(p => ({...p, titre: e.target.value}))} required placeholder="Ex: Règlements 916e" />
              </div>
              <div className="form-group">
                <label className="form-label">Catégorie</label>
                <select className="form-input" value={folderForm.categorie} onChange={e => setFolderForm(p => ({...p, categorie: e.target.value}))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {CAT_LABELS[c]}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--space-sm)' }}>📂 Créer</button>
          </form>
        </div>
      )}

      {showForm && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>{editId ? '✏️ Modifier' : '📄 Ajouter un document'}</h3>
          {isSousOff && !editId && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>📩 Soumis à validation par un officier.</p>}
          <form onSubmit={submitDoc}>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
                <label className="form-label">Titre *</label>
                <input type="text" className="form-input" value={form.titre} onChange={e => setForm(p => ({...p, titre: e.target.value}))} required placeholder="Nom du document" />
              </div>
              <div className="form-group">
                <label className="form-label">Catégorie</label>
                <select className="form-input" value={form.categorie} onChange={e => setForm(p => ({...p, categorie: e.target.value}))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {CAT_LABELS[c]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
                <label className="form-label">URL / Lien *</label>
                <input type="url" className="form-input" value={form.url} onChange={e => setForm(p => ({...p, url: e.target.value}))} placeholder="https://docs.google.com/..." required />
              </div>
              <div className="form-group">
                <label className="form-label">Répertoire</label>
                <select className="form-input" value={form.repertoire_id} onChange={e => setForm(p => ({...p, repertoire_id: e.target.value}))}>
                  <option value="">— Racine —</option>
                  {folders.map(f => <option key={f.id} value={f.id}>📂 {f.titre}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input type="text" className="form-input" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Brève description..." />
            </div>
            <button type="submit" className="btn btn-primary">{editId ? '💾 Modifier' : '📄 Ajouter'}</button>
          </form>
        </div>
      )}

      {/* Search/Filter */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <input className="form-input" style={{ maxWidth: 300 }} placeholder="Rechercher un document..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-input" style={{ maxWidth: 200 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {CAT_LABELS[c]}</option>)}
        </select>
      </div>

      {docs.length === 0 ? (
        <div className="paper-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>📚 Aucun document</p>
          {canAdd && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ajoutez des liens vers vos Google Docs, règlements, procédures...</p>}
        </div>
      ) : (
        <>
          {/* Folders as expandable sections */}
          {folders.filter(matchSearch).map(folder => {
            const children = docsInFolder(folder.id).filter(matchSearch)
            const isOpen = openFolders[folder.id]
            return (
              <div key={folder.id} className="paper-card" style={{ marginBottom: 'var(--space-md)', overflow: 'hidden' }}>
                <div onClick={() => toggleFolder(folder.id)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-md)', cursor: 'pointer', background: isOpen ? 'rgba(79,98,68,0.05)' : '' }}>
                  <span style={{ fontSize: '1.3rem' }}>{isOpen ? '📂' : '📁'}</span>
                  <strong style={{ flex: 1 }}>{folder.titre}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{children.length} doc{children.length !== 1 ? 's' : ''}</span>
                  <span>{isOpen ? '▾' : '▸'}</span>
                </div>
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border-color)' }}>
                    {children.length === 0 ? (
                      <p style={{ padding: 'var(--space-md)', margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Répertoire vide</p>
                    ) : children.map(doc => (
                      <DocRow key={doc.id} doc={doc} isOfficier={isOfficier} isAdmin={user?.isAdmin} onEdit={startEdit} onRemove={remove} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Loose docs by category */}
          {(() => {
            const filtered = looseDocs.filter(matchSearch)
            if (filtered.length === 0) return null
            const grouped = {}
            filtered.forEach(d => { (grouped[d.categorie] = grouped[d.categorie] || []).push(d) })
            return Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: 'var(--space-lg)' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: 'var(--space-sm)', color: 'var(--military-dark)' }}>{CAT_ICONS[cat]} {CAT_LABELS[cat]}</h2>
                <div className="paper-card">
                  {items.map(doc => <DocRow key={doc.id} doc={doc} isOfficier={isOfficier} isAdmin={user?.isAdmin} onEdit={startEdit} onRemove={remove} />)}
                </div>
              </div>
            ))
          })()}
        </>
      )}
    </div>
  )
}

// Detect URL type for smart display
function getUrlType(url) {
  if (!url) return 'none'
  if (url.match(/docs\.google\.com\/document/)) return 'gdoc'
  if (url.match(/docs\.google\.com\/spreadsheets/)) return 'gsheet'
  if (url.match(/docs\.google\.com\/presentation/)) return 'gslide'
  if (url.match(/drive\.google\.com/)) return 'gdrive'
  if (url.match(/\.pdf(\?|$)/i)) return 'pdf'
  if (url.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i)) return 'image'
  return 'link'
}

// Convert Google Doc/Sheet URLs to embeddable format
function getEmbedUrl(url) {
  if (!url) return null
  // Google Docs → /pub for embed
  const gdocMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/)
  if (gdocMatch) return `https://docs.google.com/document/d/${gdocMatch[1]}/pub?embedded=true`
  // Google Sheets → /pubhtml
  const gsheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (gsheetMatch) return `https://docs.google.com/spreadsheets/d/${gsheetMatch[1]}/pubhtml?widget=true&headers=false`
  // Google Slides → /embed
  const gslideMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/)
  if (gslideMatch) return `https://docs.google.com/presentation/d/${gslideMatch[1]}/embed`
  // Google Drive file → preview
  const gdriveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (gdriveMatch) return `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`
  // PDF → use Google Docs viewer as fallback or direct embed
  if (url.match(/\.pdf(\?|$)/i)) return url
  return null
}

const URL_TYPE_ICONS = { gdoc: '📝', gsheet: '📊', gslide: '📽️', gdrive: '☁️', pdf: '📕', image: '🖼️', link: '🔗', none: '📄' }
const URL_TYPE_LABELS = { gdoc: 'Google Doc', gsheet: 'Google Sheet', gslide: 'Google Slides', gdrive: 'Google Drive', pdf: 'PDF', image: 'Image', link: 'Lien externe', none: 'Document' }

function DocRow({ doc, isOfficier, isAdmin, onEdit, onRemove }) {
  const [showViewer, setShowViewer] = useState(false)
  const urlType = getUrlType(doc.url)
  const embedUrl = getEmbedUrl(doc.url)
  const canEmbed = ['gdoc', 'gsheet', 'gslide', 'gdrive', 'pdf'].includes(urlType)

  const handleClick = () => {
    if (canEmbed) {
      setShowViewer(true)
    } else if (doc.url) {
      window.open(doc.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <>
      <div className="doc-card" onClick={handleClick}>
        <div className="doc-card-icon">{URL_TYPE_ICONS[urlType]}</div>
        <div className="doc-card-content">
          <div className="doc-card-title">{doc.titre}</div>
          {doc.description && <div className="doc-card-desc">{doc.description}</div>}
          <div className="doc-card-meta">
            <span className="doc-type-badge">{URL_TYPE_LABELS[urlType]}</span>
            {canEmbed && <span className="doc-embed-hint">📖 Cliquer pour consulter</span>}
          </div>
        </div>
        <div className="doc-card-actions" onClick={e => e.stopPropagation()}>
          {doc.url && (
            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm" title="Ouvrir dans un nouvel onglet">↗️</a>
          )}
          {isOfficier && <button className="btn btn-sm" onClick={() => onEdit(doc)} title="Modifier">✏️</button>}
          {isAdmin && <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onRemove(doc.id)} title="Supprimer">🗑️</button>}
        </div>
      </div>

      {showViewer && (
        <div className="doc-viewer-overlay" onClick={() => setShowViewer(false)}>
          <div className="doc-viewer" onClick={e => e.stopPropagation()}>
            <div className="doc-viewer-header">
              <h3>{doc.titre}</h3>
              <div className="doc-viewer-toolbar">
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">↗️ Nouvel onglet</a>
                <button className="btn btn-sm" onClick={() => setShowViewer(false)}>✕ Fermer</button>
              </div>
            </div>
            {urlType === 'image' ? (
              <div className="doc-viewer-body" style={{ textAlign: 'center' }}>
                <img src={doc.url} alt={doc.titre} style={{ maxWidth: '100%', maxHeight: '80vh' }} />
              </div>
            ) : (
              <iframe
                src={embedUrl || doc.url}
                className="doc-viewer-iframe"
                title={doc.titre}
                allowFullScreen
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}
