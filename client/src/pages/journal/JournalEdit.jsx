import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import LayoutEditor from '../../components/LayoutEditor'

export default function JournalEdit() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [editMeta, setEditMeta] = useState(false)
  const [form, setForm] = useState({ titre: '', sous_titre: '' })

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    try {
      const res = await api.get(`/journal/${id}`)
      const a = res.data.data
      setArticle(a)
      setForm({ titre: a.titre || '', sous_titre: a.sous_titre || '' })

      if (a.layout) {
        const layout = typeof a.layout === 'string' ? JSON.parse(a.layout) : a.layout
        if (layout.blocks) setBlocks(layout.blocks)
        else setBlocks(generateDefaultBlocks(a))
      } else {
        setBlocks(generateDefaultBlocks(a))
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const generateDefaultBlocks = (a) => {
    const b = []
    let y = 20

    // Newspaper masthead
    b.push({ id: 'masthead-line', type: 'separator', content: '', x: 40, y, w: 720, h: 6 })
    y += 12
    b.push({ id: 'masthead', type: 'title', content: '<b>NACHRICHTENBLATT</b>', x: 100, y, w: 600, h: 50 })
    y += 55
    b.push({ id: 'masthead-sub', type: 'text', content: `<i>Nachrichtenblatt des 7. Armeekorps — ${new Date().toLocaleDateString('fr-FR')}</i>`, x: 150, y, w: 500, h: 25 })
    y += 30
    b.push({ id: 'masthead-line2', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
    y += 20

    // Article title
    b.push({ id: 'titre', type: 'title', content: `<b>${a?.titre || 'TITRE DE L\'ARTICLE'}</b>`, x: 40, y, w: 720, h: 40 })
    y += 50
    if (a?.sous_titre) {
      b.push({ id: 'sous-titre', type: 'text', content: `<i>${a.sous_titre}</i>`, x: 40, y, w: 720, h: 25 })
      y += 35
    }

    // Author line
    b.push({ id: 'auteur', type: 'text', content: `<b>Par</b> ${a?.auteur_grade || ''} ${a?.auteur_prenom || ''} ${a?.auteur_nom || ''}`, x: 40, y, w: 400, h: 22 })
    y += 30
    b.push({ id: 'sep-content', type: 'separator', content: '', x: 40, y, w: 720, h: 2 })
    y += 15

    // Content area
    b.push({ id: 'contenu', type: 'text', content: a?.contenu || 'Rédigez votre article ici...', x: 40, y, w: 720, h: 300 })
    y += 320

    // Photo placeholder
    b.push({ id: 'photo1', type: 'image', content: '', x: 200, y, w: 400, h: 250 })
    y += 270

    // Footer
    b.push({ id: 'footer-sep', type: 'separator', content: '', x: 40, y, w: 720, h: 2 })
    y += 10
    b.push({ id: 'footer', type: 'text', content: '<i>Archives du 7. Armeekorps — Nachrichtenblatt</i>', x: 200, y, w: 400, h: 22 })

    return b
  }

  const handleSave = async (newBlocks) => {
    try {
      // Save meta if changed
      if (form.titre !== article.titre || form.sous_titre !== article.sous_titre) {
        await api.put(`/journal/${id}`, form)
      }
      await api.put(`/journal/${id}/layout`, { layout: { blocks: newBlocks } })
      setBlocks(newBlocks)
      setMessage('💾 Article sauvegardé')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Erreur: ' + (err.response?.data?.error || err.message))
    }
  }

  const handlePublish = async (html, publishedBlocks) => {
    try {
      await api.put(`/journal/${id}`, { ...form, contenu: article.contenu })
      await api.put(`/journal/${id}/layout`, { layout: { blocks: publishedBlocks || blocks, html_published: html } })
      // Submit for validation
      const res = await api.put(`/journal/${id}/submit`)
      if (res.data.autoPublished) {
        setMessage('📰 Article publié ! Redirection...')
      } else {
        setMessage('📨 Article soumis pour validation ! Redirection...')
      }
      setTimeout(() => navigate('/journal'), 1500)
    } catch (err) {
      setMessage('❌ Erreur: ' + (err.response?.data?.error || err.message))
    }
  }

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>
  if (!article) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Article introuvable</div>

  return (
    <div style={{ padding: '1rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
        <BackButton label="← Journal" />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditMeta(!editMeta)}>
            {editMeta ? '✕ Fermer' : '📋 Titre / Sous-titre'}
          </button>
          {message && <div className={`alert ${message.includes('❌') ? 'alert-danger' : 'alert-success'}`} style={{ margin: 0 }}>{message}</div>}
        </div>
      </div>

      {editMeta && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-md)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label className="form-label">Titre de l'article</label>
              <input className="form-input" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
            </div>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label className="form-label">Sous-titre (optionnel)</label>
              <input className="form-input" value={form.sous_titre} onChange={e => setForm(f => ({ ...f, sous_titre: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      <LayoutEditor
        blocks={blocks}
        onSave={handleSave}
        onPublish={handlePublish}
        title={`Article — ${form.titre}`}
        publishLabel="📨 Soumettre / Publier"
      />
    </div>
  )
}
