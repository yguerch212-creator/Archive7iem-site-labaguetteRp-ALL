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

  const isAuthor = article?.auteur_id === user?.effectif_id
  const canEdit = article && (isAuthor || user?.isAdmin || user?.isEtatMajor) && article.statut !== 'publie'
  const canDelete = article && (article.auteur_id === user?.effectif_id || user?.isAdmin || user?.isEtatMajor)
  const layout = article?.layout ? (typeof article.layout === 'string' ? JSON.parse(article.layout) : article.layout) : null
  const hasBlocks = layout?.blocks && layout.blocks.length > 0

  const deleteArticle = async () => {
    if (!confirm('Supprimer cet article ?')) return
    try {
      await api.delete(`/journal/${id}`)
      navigate('/journal')
    } catch { setMsg('Erreur') }
  }

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>
  if (!article) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>{msg || 'Article introuvable'}</div>

  // If layout has blocks, render from blocks (best quality — auto-sizes)
  if (hasBlocks) {
    return (
      <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 8 }}>
          <BackButton label="← Journal" />
          <div style={{ display: 'flex', gap: 6 }}>
            {canEdit && <button className="btn btn-secondary btn-small" className="layout-desktop-only" onClick={() => navigate(`/journal/${id}/edit`)}>✏️ Modifier</button>}
            {canDelete && <button className="btn btn-danger btn-small" onClick={deleteArticle}>🗑️</button>}
            <button className="btn btn-secondary btn-small" onClick={() => exportToPdf('journal-article', `Journal_${article.titre}`)}>📥 PDF</button>
          </div>
        </div>
        <div id="journal-article" style={{ background: '#f5f2e8', border: '1px solid #c4b99a', padding: 0, maxWidth: 850, margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <LayoutRenderer blocks={layout.blocks} width={800} />
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
          {canEdit && <button className="btn btn-secondary btn-small" className="layout-desktop-only" onClick={() => navigate(`/journal/${id}/edit`)}>✏️ Modifier</button>}
          {canDelete && <button className="btn btn-danger btn-small" onClick={deleteArticle}>🗑️</button>}
        </div>
      </div>

      <div id="journal-article" style={{ background: '#e8e4d4', border: '1px solid #999', borderRadius: 0, padding: '40px 50px', maxWidth: 820, margin: '0 auto', fontFamily: "'IBM Plex Mono', monospace", boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        {/* Feldzeitung masthead */}
        <div style={{ borderTop: '4px solid #222', borderBottom: '2px solid #222', padding: '10px 0', marginBottom: 8, textAlign: 'center' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1a1a1a', letterSpacing: 2, lineHeight: 1.1 }}>Wacht am Korps</div>
          <div style={{ fontSize: '0.65rem', letterSpacing: 4, color: '#555', fontStyle: 'italic' }}>Feldzeitung des 7. Armeekorps</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#666', marginBottom: 12, borderBottom: '1px solid #999', paddingBottom: 6 }}>
          <span>Herausgeber: Propagandakompanie</span>
          <span>{new Date(article.date_publication || article.created_at).toLocaleDateString('fr-FR')}</span>
        </div>

        {/* Headline */}
        <h2 style={{ fontSize: '1.5rem', marginBottom: 4, color: '#111', fontWeight: 900, lineHeight: 1.2 }}>{article.titre}</h2>
        {article.sous_titre && <p style={{ fontSize: '0.88rem', fontStyle: 'italic', color: '#444', marginBottom: 12 }}>{article.sous_titre}</p>}
        <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: 6 }}>
          Par {article.auteur_grade || ''} {article.auteur_prenom} {article.auteur_nom} — {article.auteur_unite || ''}
        </div>
        <hr style={{ border: 'none', borderTop: '2px solid #333', margin: '0 0 16px' }} />
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem', lineHeight: 1.6, fontFamily: 'inherit', columns: '2', columnGap: '24px', columnRule: '1px solid #ccc' }}>{article.contenu}</pre>
        <div style={{ borderTop: '3px solid #222', marginTop: 24, paddingTop: 6, textAlign: 'center', fontSize: '0.6rem', fontStyle: 'italic', color: '#777' }}>
          Feldzeitung des 7. Armeekorps — Nur für den Dienstgebrauch — Nachdruck verboten
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
        {article.statut === 'brouillon' && canEdit && (
          <button className="btn btn-primary layout-desktop-only" onClick={() => navigate(`/journal/${id}/edit`)}>✏️ Éditer la mise en page</button>
        )}
      </div>
    </div>
  )
}
