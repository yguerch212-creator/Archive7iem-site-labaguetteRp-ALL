import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import './documentation.css'

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
        flash('success', 'Document modifié')
      } else {
        const res = await api.post('/documentation', form)
        flash('success', res.data.data?.statut === 'en_attente' ? '📩 Document soumis — en attente de validation' : 'Document ajouté')
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
      flash('success', 'Répertoire créé')
      setShowFolderForm(false)
      setFolderForm({ titre: '', description: '', categorie: 'Autre' })
      load()
    } catch (err) { flash('error', err.response?.data?.message || 'Erreur') }
  }

  const startEdit = (doc) => {
    setForm({ titre: doc.titre, description: doc.description || '', url: doc.url || '', categorie: doc.categorie, ordre: doc.ordre, repertoire_id: doc.repertoire_id || '' })
    setEditId(doc.id)
    setShowForm(true)
    setShowFolderForm(false)
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

  // Separate folders and docs
  const folders = docs.filter(d => d.is_repertoire)
  const looseDocs = docs.filter(d => !d.is_repertoire && !d.repertoire_id)
  const docsInFolder = (folderId) => docs.filter(d => !d.is_repertoire && d.repertoire_id === folderId)

  return (
    <div className="docs-page">
      <BackButton label="← Tableau de bord" />
      <div className="docs-header">
        <h1>📚 Documentation & Règlements</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isOfficier && (
            <button className="btn btn-sm" onClick={() => { setShowFolderForm(!showFolderForm); setShowForm(false) }}>
              {showFolderForm ? '✕' : '📂 Créer un répertoire'}
            </button>
          )}
          {canAdd && (
            <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setShowFolderForm(false); setEditId(null); setForm({ titre: '', description: '', url: '', categorie: 'Autre', ordre: 0, repertoire_id: '' }) }}>
              {showForm ? '✕ Annuler' : '+ Ajouter un document'}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="alert-close">✕</button>
        </div>
      )}

      {/* Pending approval */}
      {pending.length > 0 && (
        <div className="docs-pending">
          <h2 className="docs-cat-title">⏳ En attente de validation ({pending.length})</h2>
          <div className="docs-grid">
            {pending.map(doc => (
              <div key={doc.id} className="card docs-card docs-card-pending">
                <div className="docs-card-header">
                  <h3 className="docs-card-title">{doc.titre}</h3>
                  <span className="badge badge-warning">En attente</span>
                </div>
                {doc.description && <p className="docs-card-desc">{doc.description}</p>}
                {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="docs-url">🔗 {doc.url}</a>}
                <p className="docs-card-meta">Par {doc.created_by_nom}</p>
                <div className="docs-card-actions">
                  <button className="btn btn-sm btn-primary" onClick={() => approve(doc.id, 'approuve')}>✅ Approuver</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => approve(doc.id, 'refuse')}>❌ Refuser</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Folder creation form */}
      {showFolderForm && (
        <div className="card docs-form">
          <h3>📂 Nouveau répertoire</h3>
          <form onSubmit={submitFolder}>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Nom du répertoire *</label>
                <input type="text" className="form-input" value={folderForm.titre} onChange={e => setFolderForm(p => ({...p, titre: e.target.value}))} required placeholder="Ex: Règlements 916e" />
              </div>
              <div className="form-group">
                <label className="form-label">Catégorie</label>
                <select className="form-input" value={folderForm.categorie} onChange={e => setFolderForm(p => ({...p, categorie: e.target.value}))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {CAT_LABELS[c]}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input type="text" className="form-input" value={folderForm.description} onChange={e => setFolderForm(p => ({...p, description: e.target.value}))} placeholder="Brève description..." />
            </div>
            <button type="submit" className="btn btn-primary">📂 Créer</button>
          </form>
        </div>
      )}

      {/* Doc creation/edit form */}
      {showForm && (
        <div className="card docs-form">
          <h3>{editId ? '✏️ Modifier le document' : '📄 Ajouter un document'}</h3>
          {isSousOff && !editId && <p className="docs-submit-note">📩 Votre document sera soumis à validation par un officier.</p>}
          <form onSubmit={submitDoc}>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
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
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">URL / Lien</label>
                <input type="url" className="form-input" value={form.url} onChange={e => setForm(p => ({...p, url: e.target.value}))} placeholder="https://docs.google.com/..." />
              </div>
              <div className="form-group">
                <label className="form-label">Répertoire</label>
                <select className="form-input" value={form.repertoire_id} onChange={e => setForm(p => ({...p, repertoire_id: e.target.value}))}>
                  <option value="">— Aucun (racine) —</option>
                  {folders.map(f => <option key={f.id} value={f.id}>📂 {f.titre}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input form-textarea" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={2} placeholder="Brève description..." />
            </div>
            <button type="submit" className="btn btn-primary">{editId ? '💾 Modifier' : '📄 Ajouter'}</button>
          </form>
        </div>
      )}

      {/* Content */}
      {docs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '2rem' }}>📚</p>
          <p>Aucun document référencé</p>
          {canAdd && <p className="text-muted">Ajoutez des liens vers vos Google Docs, règlements, procédures...</p>}
        </div>
      ) : (
        <>
          {/* Folders */}
          {folders.map(folder => {
            const children = docsInFolder(folder.id)
            const isOpen = openFolders[folder.id]
            return (
              <div key={folder.id} className="docs-folder">
                <div className="docs-folder-header" onClick={() => toggleFolder(folder.id)}>
                  <span className="docs-folder-icon">{isOpen ? '📂' : '📁'}</span>
                  <h2 className="docs-folder-title">{folder.titre}</h2>
                  <span className="docs-folder-count">{children.length} doc{children.length !== 1 ? 's' : ''}</span>
                  {folder.description && <span className="docs-folder-desc">— {folder.description}</span>}
                  <span className="docs-folder-arrow">{isOpen ? '▾' : '▸'}</span>
                  {user?.isAdmin && (
                    <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); remove(folder.id) }} title="Supprimer le répertoire">🗑️</button>
                  )}
                </div>
                {isOpen && (
                  <div className="docs-folder-content">
                    {children.length === 0 ? (
                      <p className="text-muted" style={{ padding: '1rem', margin: 0 }}>Répertoire vide</p>
                    ) : (
                      <div className="docs-grid">
                        {children.map(doc => <DocCard key={doc.id} doc={doc} user={user} isOfficier={isOfficier} onEdit={startEdit} onRemove={remove} />)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Loose docs (no folder) grouped by category */}
          {looseDocs.length > 0 && (() => {
            const grouped = {}
            looseDocs.forEach(d => {
              if (!grouped[d.categorie]) grouped[d.categorie] = []
              grouped[d.categorie].push(d)
            })
            return Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="docs-category">
                <h2 className="docs-cat-title">{CAT_ICONS[cat]} {CAT_LABELS[cat]}</h2>
                <div className="docs-grid">
                  {items.map(doc => <DocCard key={doc.id} doc={doc} user={user} isOfficier={isOfficier} onEdit={startEdit} onRemove={remove} />)}
                </div>
              </div>
            ))
          })()}
        </>
      )}
    </div>
  )
}

function DocCard({ doc, user, isOfficier, onEdit, onRemove }) {
  return (
    <div className={`card docs-card ${!doc.visible ? 'docs-hidden' : ''}`}>
      <div className="docs-card-header">
        <h3 className="docs-card-title">{doc.titre}</h3>
        {!doc.visible && <span className="badge badge-muted">Masqué</span>}
      </div>
      {doc.description && <p className="docs-card-desc">{doc.description}</p>}
      <div className="docs-card-actions">
        {doc.url && (
          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm docs-link">
            🔗 Ouvrir le lien
          </a>
        )}
        {isOfficier && (
          <>
            <button className="btn btn-sm" onClick={() => onEdit(doc)}>✏️</button>
            {user?.isAdmin && <button className="btn btn-sm btn-ghost" onClick={() => onRemove(doc.id)}>🗑️</button>}
          </>
        )}
      </div>
    </div>
  )
}
