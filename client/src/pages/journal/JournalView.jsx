import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import LayoutRenderer from '../../components/LayoutRenderer'
import { exportToPdf } from '../../utils/exportPdf'

export default function JournalView() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadArticle() }, [id])

  const loadArticle = async () => {
    try {
      const res = await api.get(`/journal/${id}`)
      setArticle(res.data.data)
    } catch { setMsg('Article introuvable') }
    setLoading(false)
  }

  const canEdit = article && (article.auteur_id === user?.effectif_id || user?.isAdmin || user?.isEtatMajor) && article.statut !== 'publie'
  const canDelete = article && (article.auteur_id === user?.effectif_id || user?.isAdmin || user?.isEtatMajor)
  const layout = article?.layout ? (typeof article.layout === 'string' ? JSON.parse(article.layout) : article.layout) : null

  const deleteArticle = async () => {
    if (!confirm('Supprimer cet article ?')) return
    try {
      await api.delete(`/journal/${id}`)
      navigate('/journal')
    } catch { setMsg('Erreur') }
  }

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>
  if (!article) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>{msg || 'Article introuvable'}</div>

  // If layout has html_published, show it
  if (layout?.html_published) {
    return (
      <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 8 }}>
          <BackButton label="← Journal" />
          <div style={{ display: 'flex', gap: 6 }}>
            {canEdit && <button className="btn btn-secondary btn-small" onClick={() => navigate(`/journal/${id}/edit`)}>✏️ Modifier</button>}
            {canDelete && <button className="btn btn-danger btn-small" onClick={deleteArticle}>🗑️</button>}
            <button className="btn btn-secondary btn-small" onClick={() => exportToPdf('journal-article', `Journal_${article.titre}`)}>📥 PDF</button>
          </div>
        </div>
        <div id="journal-article">
          <LayoutRenderer html={layout.html_published} />
        </div>
      </div>
    )
  }

  // Fallback: simple text view (no layout yet)
  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 8 }}>
        <BackButton label="← Journal" />
        <div style={{ display: 'flex', gap: 6 }}>
          {canEdit && <button className="btn btn-secondary btn-small" onClick={() => navigate(`/journal/${id}/edit`)}>✏️ Modifier</button>}
          {canDelete && <button className="btn btn-danger btn-small" onClick={deleteArticle}>🗑️</button>}
        </div>
      </div>

      <div id="journal-article" style={{ background: '#f5f2e8', border: '1px solid #c4b99a', borderRadius: 4, padding: '50px 60px', maxWidth: 820, margin: '0 auto', fontFamily: "'IBM Plex Mono', monospace" }}>
        {/* Newspaper masthead */}
        <div style={{ textAlign: 'center', borderTop: '4px solid #3d5a3e', borderBottom: '4px solid #3d5a3e', padding: '12px 0', marginBottom: 30 }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: 8, color: '#666', textTransform: 'uppercase' }}>Nachrichtenblatt des 7. Armeekorps</div>
          <h1 style={{ margin: '6px 0', fontSize: '2rem', color: '#3d5a3e', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 900 }}>NACHRICHTENBLATT</h1>
          <div style={{ fontSize: '0.75rem', color: '#555' }}>{new Date(article.date_publication || article.created_at).toLocaleDateString('fr-FR')}</div>
        </div>

        <h2 style={{ fontSize: '1.4rem', marginBottom: 8, color: '#2d2d2d' }}>{article.titre}</h2>
        {article.sous_titre && <p style={{ fontSize: '0.95rem', fontStyle: 'italic', color: '#555', marginBottom: 20 }}>{article.sous_titre}</p>}
        <p style={{ fontSize: '0.78rem', color: '#777', marginBottom: 20 }}>
          Par {article.auteur_grade || ''} {article.auteur_prenom} {article.auteur_nom} — {article.auteur_unite || ''}
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #c4b99a', margin: '0 0 20px' }} />
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: 1.7, fontFamily: 'inherit' }}>{article.contenu}</pre>
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
        {article.statut === 'brouillon' && canEdit && (
          <button className="btn btn-primary" onClick={() => navigate(`/journal/${id}/edit`)}>✏️ Éditer la mise en page</button>
        )}
      </div>
    </div>
  )
}
