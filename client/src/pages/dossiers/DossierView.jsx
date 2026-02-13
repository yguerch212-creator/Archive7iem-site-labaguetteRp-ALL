import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import './dossiers.css'

export default function DossierView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dossier, setDossier] = useState(null)
  const [entrees, setEntrees] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [noteForm, setNoteForm] = useState({ titre: '', contenu: '', date_rp: '' })
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0) // 0 = cover

  useEffect(() => { load() }, [id])

  const load = async () => {
    try {
      const res = await api.get(`/dossiers/${id}`)
      setDossier(res.data.data.dossier)
      setEntrees(res.data.data.entrees || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const addNote = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/dossiers/${id}/entrees`, { type: 'note', ...noteForm })
      setShowForm(false)
      setNoteForm({ titre: '', contenu: '', date_rp: '' })
      setMessage({ type: 'success', text: 'Note ajoutée' })
      setTimeout(() => setMessage(null), 2000)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const deleteEntry = async (entryId) => {
    if (!confirm('Supprimer cette entrée ?')) return
    try { await api.delete(`/dossiers/entrees/${entryId}`); load() } catch {}
  }

  const formatDate = (d) => {
    if (!d) return '—'
    const date = new Date(d)
    if (isNaN(date)) return d
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>
  if (!dossier) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Dossier non trouvé</div>

  // Pages: [cover, ...entries, add-note page]
  const totalPages = entrees.length + 1 // cover + entries
  const canWrite = user?.isAdmin || user?.isOfficier || user?.isRecenseur || user?.id === dossier.created_by

  const prevPage = () => setCurrentPage(p => Math.max(0, p - 1))
  const nextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1))

  return (
    <div className="dossier-detail-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-small">← Retour</button>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {canWrite && <Link to={`/dossiers/${id}/layout`} className="btn btn-secondary btn-small">🖋️ Mise en page</Link>}
            {canWrite && (
              <button className="btn btn-primary btn-small" onClick={() => { setShowForm(!showForm); setCurrentPage(totalPages) }}>
                {showForm ? '✕' : '+ Ajouter une note'}
              </button>
            )}
          </div>
        </div>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {/* Book */}
      <div className="book-container">
        {/* Navigation */}
        <div className="book-nav">
          <button className="book-nav-btn" onClick={prevPage} disabled={currentPage === 0}>◀</button>
          <span className="book-page-indicator">
            {currentPage === 0 ? 'Couverture' : currentPage <= entrees.length ? `Page ${currentPage} / ${entrees.length}` : 'Nouvelle note'}
          </span>
          <button className="book-nav-btn" onClick={nextPage} disabled={currentPage >= totalPages}>▶</button>
        </div>

        <div className="book-page">
          {/* Cover page */}
          {currentPage === 0 && (
            <div className="book-cover">
              <div className="book-cover-stamp">GEHEIM</div>
              <div className="book-cover-emblem">✠</div>
              <h1 className="book-cover-title">{dossier.titre}</h1>
              {dossier.description && <p className="book-cover-desc">{dossier.description}</p>}
              <div className="book-cover-meta">
                <span>{dossier.type}</span>
                <span>{dossier.visibilite === 'public' ? '🌐 Public' : dossier.visibilite === 'prive' ? '🔒 Privé' : '🔗 Par lien'}</span>
                <span>{entrees.length} entrée{entrees.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="book-cover-footer">
                Archives du 7e Armeekorps<br/>
                <span style={{ fontSize: '0.7rem' }}>Créé le {formatDate(dossier.created_at)}</span>
              </div>
            </div>
          )}

          {/* Entry pages */}
          {currentPage > 0 && currentPage <= entrees.length && (() => {
            const e = entrees[currentPage - 1]
            return (
              <div className="book-entry">
                <div className="book-entry-header">
                  <span className="book-entry-num">N° {currentPage}</span>
                  <span className="book-entry-date">{e.date_rp || formatDate(e.created_at)}</span>
                </div>
                {e.titre && <h2 className="book-entry-title">{e.titre}</h2>}
                <div className="book-entry-content">{e.contenu}</div>
                <div className="book-entry-footer">
                  <span>Par {e.created_by_nom}</span>
                  <span>{formatDate(e.created_at)}</span>
                  {(user?.isAdmin || user?.id === e.created_by) && (
                    <button className="btn btn-sm" style={{ color: 'var(--danger)', fontSize: '0.7rem', padding: '2px 6px' }} onClick={() => deleteEntry(e.id)}>🗑️</button>
                  )}
                </div>
              </div>
            )
          })()}

          {/* New note form (last "page") */}
          {currentPage > entrees.length && showForm && (
            <div className="book-entry">
              <h2 className="book-entry-title">📝 Nouvelle note</h2>
              <form onSubmit={addNote}>
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                  <div className="form-group" style={{ flex: 2, minWidth: 150 }}>
                    <label className="form-label">Titre</label>
                    <input type="text" className="form-input" value={noteForm.titre} onChange={e => setNoteForm(p => ({...p, titre: e.target.value}))} placeholder="Objet..." />
                  </div>
                  <div className="form-group" style={{ minWidth: 120 }}>
                    <label className="form-label">Date RP</label>
                    <input type="text" className="form-input" value={noteForm.date_rp} onChange={e => setNoteForm(p => ({...p, date_rp: e.target.value}))} placeholder="xx/xx/1944" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Contenu *</label>
                  <textarea className="form-input form-textarea" value={noteForm.contenu} onChange={e => setNoteForm(p => ({...p, contenu: e.target.value}))} required rows={6} />
                </div>
                <button type="submit" className="btn btn-primary">📝 Ajouter</button>
              </form>
            </div>
          )}
        </div>

        {/* Page dots */}
        {entrees.length > 0 && (
          <div className="book-dots">
            {Array.from({ length: totalPages + (showForm ? 1 : 0) }, (_, i) => (
              <button key={i} className={`book-dot ${currentPage === i ? 'active' : ''}`} onClick={() => setCurrentPage(i)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
