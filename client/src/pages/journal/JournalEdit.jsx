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
    const W = 800
    const M = 30 // margin
    const CW = W - M * 2 // content width = 740
    let y = 20

    // ═══ MASTHEAD ═══
    b.push({ id: 'top-rule', type: 'separator', content: '', x: M, y, w: CW, h: 6 })
    y += 10
    b.push({ id: 'eagle-left', type: 'text', content: '✠', x: M + 10, y: y + 5, w: 40, h: 40 })
    b.push({ id: 'masthead', type: 'title', content: '<b>NACHRICHTENBLATT</b>', x: 120, y, w: 560, h: 50 })
    b.push({ id: 'eagle-right', type: 'text', content: '✠', x: CW - 20, y: y + 5, w: 40, h: 40 })
    y += 52
    b.push({ id: 'masthead-sub', type: 'text', content: `<i>Offizielles Nachrichtenblatt des 7. Armeekorps</i>`, x: 160, y, w: 480, h: 20 })
    y += 24
    b.push({ id: 'masthead-info', type: 'text', content: `<b>N°___</b> — ${new Date().toLocaleDateString('fr-FR')} — <i>Nur für den Dienstgebrauch</i>`, x: 120, y, w: 560, h: 20 })
    y += 24
    b.push({ id: 'top-rule2', type: 'separator', content: '', x: M, y, w: CW, h: 4 })
    y += 15

    // ═══ ARTICLE TITLE ═══
    b.push({ id: 'titre', type: 'title', content: `<b>${(a?.titre || 'TITRE DE L\'ARTICLE').toUpperCase()}</b>`, x: M, y, w: CW, h: 45 })
    y += 50
    b.push({ id: 'sous-titre', type: 'text', content: `<i>${a?.sous_titre || 'Sous-titre ou accroche de l\'article'}</i>`, x: M, y, w: CW, h: 22 })
    y += 28
    b.push({ id: 'auteur-line', type: 'text', content: `<b>Par</b> ${a?.auteur_grade || 'Grade'} ${a?.auteur_prenom || 'Prénom'} ${a?.auteur_nom || 'Nom'} — <i>${a?.auteur_unite || 'Unité'}</i>`, x: M, y, w: CW, h: 20 })
    y += 26
    b.push({ id: 'title-rule', type: 'separator', content: '', x: M, y, w: CW, h: 2 })
    y += 12

    // ═══ TWO-COLUMN LAYOUT ═══
    const colW = (CW - 20) / 2 // 360px each with 20px gap
    const colStartY = y

    // Left column — main text
    b.push({ id: 'col1-text', type: 'text', content: a?.contenu || 'Rédigez le contenu principal de votre article ici. Le texte peut être aussi long que nécessaire — la page s\'agrandit automatiquement vers le bas.\n\nUtilisez le gras, l\'italique et les retours à la ligne pour structurer votre texte.', x: M, y: colStartY, w: colW, h: 280 })

    // Right column — info boxes
    b.push({ id: 'info1-title', type: 'title', content: '<b>INFORMATIONS</b>', x: M + colW + 20, y: colStartY, w: colW, h: 28 })
    b.push({ id: 'info1-rule', type: 'separator', content: '', x: M + colW + 20, y: colStartY + 30, w: colW, h: 2 })
    b.push({ id: 'info1-text', type: 'text', content: '<b>Lieu :</b> _______________\n<b>Date RP :</b> ___________\n<b>Participants :</b> ________\n<b>Durée :</b> ______________', x: M + colW + 20, y: colStartY + 36, w: colW, h: 100 })

    // Photo box in right column
    b.push({ id: 'photo1', type: 'image', content: '', x: M + colW + 20, y: colStartY + 145, w: colW, h: 200 })
    b.push({ id: 'photo1-caption', type: 'text', content: '<i>Légende de la photo</i>', x: M + colW + 20, y: colStartY + 350, w: colW, h: 20 })

    y = colStartY + 300

    // ═══ SECOND SECTION ═══
    b.push({ id: 'section-rule', type: 'separator', content: '', x: M, y, w: CW, h: 2 })
    y += 12
    b.push({ id: 'section2-title', type: 'title', content: '<b>INFORMATIONS COMPLÉMENTAIRES</b>', x: M, y, w: CW, h: 28 })
    y += 35

    // Full-width photo
    b.push({ id: 'photo2', type: 'image', content: '', x: M + 100, y, w: CW - 200, h: 200 })
    y += 210
    b.push({ id: 'photo2-caption', type: 'text', content: '<i>Légende de la photo</i>', x: M + 100, y, w: CW - 200, h: 20 })
    y += 30

    // Additional text
    b.push({ id: 'col2-text', type: 'text', content: 'Texte complémentaire, détails de l\'opération, citations, etc.', x: M, y, w: CW, h: 120 })
    y += 135

    // ═══ FOOTER ═══
    b.push({ id: 'footer-rule', type: 'separator', content: '', x: M, y, w: CW, h: 4 })
    y += 10
    b.push({ id: 'footer', type: 'text', content: '<i>Archives du 7. Armeekorps — Nur für den Dienstgebrauch — Reproduction interdite</i>', x: 100, y, w: 600, h: 22 })

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
