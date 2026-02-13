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
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ titre: '', description: '', url: '', categorie: 'Autre', ordre: 0 })
  const [message, setMessage] = useState(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await api.get('/documentation', { params: user?.isAdmin ? { all: '1' } : {} })
      setDocs(res.data.data)
    } catch (err) { console.error(err) }
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      if (editId) {
        await api.put(`/documentation/${editId}`, form)
      } else {
        await api.post('/documentation', form)
      }
      setShowForm(false)
      setEditId(null)
      setForm({ titre: '', description: '', url: '', categorie: 'Autre', ordre: 0 })
      setMessage({ type: 'success', text: editId ? 'Document modifié' : 'Document ajouté' })
      setTimeout(() => setMessage(null), 2000)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const startEdit = (doc) => {
    setForm({ titre: doc.titre, description: doc.description || '', url: doc.url || '', categorie: doc.categorie, ordre: doc.ordre })
    setEditId(doc.id)
    setShowForm(true)
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce document ?')) return
    try {
      await api.delete(`/documentation/${id}`)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur' })
    }
  }

  // Group by category
  const grouped = {}
  docs.forEach(d => {
    if (!grouped[d.categorie]) grouped[d.categorie] = []
    grouped[d.categorie].push(d)
  })

  return (
    <div className="docs-page">
      <Link to="/dashboard" className="btn-back">← Tableau de bord</Link>
      <div className="docs-header">
        <h1>📚 Documentation</h1>
        {user?.isAdmin && (
          <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ titre: '', description: '', url: '', categorie: 'Autre', ordre: 0 }) }}>
            {showForm ? '✕ Annuler' : '+ Ajouter un document'}
          </button>
        )}
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="alert-close">✕</button>
        </div>
      )}

      {showForm && (
        <div className="card docs-form">
          <h3>{editId ? 'Modifier le document' : 'Ajouter un document'}</h3>
          <form onSubmit={submit}>
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
            <div className="form-group">
              <label className="form-label">URL / Lien</label>
              <input type="url" className="form-input" value={form.url} onChange={e => setForm(p => ({...p, url: e.target.value}))} placeholder="https://docs.google.com/..." />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input form-textarea" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={2} placeholder="Brève description..." />
            </div>
            <button type="submit" className="btn btn-primary">{editId ? '💾 Modifier' : '📚 Ajouter'}</button>
          </form>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '2rem' }}>📚</p>
          <p>Aucun document référencé</p>
          {user?.isAdmin && <p className="text-muted">Ajoutez des liens vers vos Google Docs, règlements, procédures...</p>}
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="docs-category">
            <h2 className="docs-cat-title">{CAT_ICONS[cat]} {CAT_LABELS[cat]}</h2>
            <div className="docs-grid">
              {items.map(doc => (
                <div key={doc.id} className={`card docs-card ${!doc.visible ? 'docs-hidden' : ''}`}>
                  <div className="docs-card-header">
                    <h3 className="docs-card-title">{doc.titre}</h3>
                    {!doc.visible && <span className="badge badge-muted">Masqué</span>}
                  </div>
                  {doc.description && <p className="docs-card-desc">{doc.description}</p>}
                  <div className="docs-card-actions">
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm docs-link">
                        🔗 Ouvrir
                      </a>
                    )}
                    {user?.isAdmin && (
                      <>
                        <button className="btn btn-sm" onClick={() => startEdit(doc)}>✏️</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => remove(doc.id)}>🗑️</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
