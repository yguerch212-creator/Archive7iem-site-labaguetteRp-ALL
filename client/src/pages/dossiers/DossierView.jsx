import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>
  if (!dossier) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Dossier non trouvé</div>

  return (
    <div className="dossier-detail-page">
      <button onClick={() => navigate(-1)} className="btn-back">← Retour</button>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>{dossier.titre}</h1>
            {dossier.description && <p className="text-muted" style={{ margin: '0.5rem 0 0' }}>{dossier.description}</p>}
            <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
              {dossier.type} · {dossier.visibilite === 'public' ? '🌐 Public' : dossier.visibilite === 'prive' ? '🔒 Privé' : '🔗 Par lien'}
              · {entrees.length} entrée{entrees.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕' : '+ Ajouter une note'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="alert-close">✕</button>
        </div>
      )}

      {showForm && (
        <div className="card dossier-form">
          <h3>📝 Ajouter une note</h3>
          <form onSubmit={addNote}>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Titre</label>
                <input type="text" className="form-input" value={noteForm.titre} onChange={e => setNoteForm(p => ({...p, titre: e.target.value}))} placeholder="Objet..." />
              </div>
              <div className="form-group">
                <label className="form-label">Date RP</label>
                <input type="text" className="form-input" value={noteForm.date_rp} onChange={e => setNoteForm(p => ({...p, date_rp: e.target.value}))} placeholder="xx/xx/1944" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Contenu *</label>
              <textarea className="form-input form-textarea" value={noteForm.contenu} onChange={e => setNoteForm(p => ({...p, contenu: e.target.value}))} required rows={4} />
            </div>
            <button type="submit" className="btn btn-primary">📝 Ajouter</button>
          </form>
        </div>
      )}

      {entrees.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Dossier vide — ajoutez des notes</p>
        </div>
      ) : (
        <div className="dossier-list">
          {entrees.map(e => (
            <div key={e.id} className="card dossier-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              {e.titre && <strong>{e.titre}</strong>}
              <p style={{ margin: '0.25rem 0' }}>{e.contenu}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Par {e.created_by_nom} · {formatDate(e.created_at)}{e.date_rp ? ` · RP: ${e.date_rp}` : ''}
                </span>
                {(user?.isAdmin || user?.id === e.created_by) && (
                  <button className="btn btn-sm btn-ghost" onClick={() => deleteEntry(e.id)}>🗑️</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
