import { useState, useEffect } from 'react'
import BackButton from '../../components/BackButton'
import api from '../../api/client'
import { formatDateTime } from '../../utils/dates'

export default function AdminModeration() {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/media/pending')
      setMedia(res.data.data || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const moderate = async (id, decision) => {
    try {
      await api.put(`/media/${id}/moderate`, { decision })
      setMessage(decision === 'approuve' ? '✅ Approuvé' : '❌ Refusé et supprimé')
      setTimeout(() => setMessage(''), 2000)
      load()
    } catch (err) {
      setMessage('Erreur: ' + (err.response?.data?.error || err.message))
    }
  }

  return (
    <div className="container">
      <BackButton />
      <h1 className="page-title">📸 Modération des médias</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Toute photo ou vidéo uploadée passe automatiquement ici pour validation avant d'être visible.
      </p>

      {message && <div className="alert alert-success">{message}</div>}

      {loading ? <p>Chargement...</p> : media.length === 0 ? (
        <div className="paper-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>✅ Aucun média en attente de modération</p>
        </div>
      ) : (
        <div className="moderation-grid">
          {media.map(m => (
            <div key={m.id} className="paper-card moderation-card">
              <div className="mod-preview">
                {m.mime_type.startsWith('image/') ? (
                  <img src={`/api/media/file/${m.filename}`} alt={m.original_name} />
                ) : m.mime_type.startsWith('video/') ? (
                  <video src={`/api/media/file/${m.filename}`} controls style={{ maxWidth: '100%', maxHeight: 200 }} />
                ) : (
                  <div className="mod-file-icon">📄 {m.original_name}</div>
                )}
              </div>
              <div className="mod-info">
                <strong>{m.original_name}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {m.uploaded_by_username} · {m.context_type} · {(m.size_bytes / 1024).toFixed(0)} Ko
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {formatDateTime(m.created_at)}
                </div>
              </div>
              <div className="mod-actions">
                <button className="btn btn-primary btn-sm" onClick={() => moderate(m.id, 'approuve')}>✅ Approuver</button>
                <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => moderate(m.id, 'refuse')}>❌ Refuser</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
