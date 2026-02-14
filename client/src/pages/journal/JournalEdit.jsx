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
    const M = 25
    const CW = W - M * 2 // 750
    const col3W = Math.floor((CW - 20) / 3) // ~243 each, 10px gaps
    const col2W = Math.floor((CW - 10) / 2)  // ~370 each
    let y = 15

    // ═══ MASTHEAD ═══
    b.push({ id: 'top-rule-thick', type: 'separator', content: '', x: M, y, w: CW, h: 6 })
    y += 14
    b.push({ id: 'masthead', type: 'title', content: '<b>Wacht am Korps</b>', x: M, y, w: CW, h: 60 })
    y += 64
    b.push({ id: 'sub-feld', type: 'text', content: '<i>Feldzeitung des 7. Armeekorps</i>', x: M, y, w: CW, h: 18 })
    y += 22
    b.push({ id: 'masthead-info', type: 'text', content: `Nr. ___ — ${new Date().toLocaleDateString('fr-FR')} — <i>Herausgeber: Propagandakompanie</i>`, x: M, y, w: CW, h: 18 })
    y += 24
    b.push({ id: 'top-rule2', type: 'separator', content: '', x: M, y, w: CW, h: 4 })
    y += 14

    // ═══ HEADLINE ═══
    b.push({ id: 'headline', type: 'title', content: `<b>${(a?.titre || 'TITRE PRINCIPAL').toUpperCase()}</b>`, x: M, y, w: CW, h: 40 })
    y += 46
    b.push({ id: 'headline-sub', type: 'text', content: `<i>${a?.sous_titre || 'Sous-titre de l\'article'}</i>`, x: M, y, w: CW, h: 20 })
    y += 26
    b.push({ id: 'head-rule', type: 'separator', content: '', x: M, y, w: CW, h: 2 })
    y += 14

    // ═══ 3 COLONNES ═══
    const colY = y
    const gap = 15
    const c1x = M
    const c2x = M + col3W + gap
    const c3x = M + (col3W + gap) * 2

    // Col 1 : article principal + photo
    b.push({ id: 'col1-text', type: 'text', content: a?.contenu || '<b>FRONT OUEST.</b> — Rédigez ici le corps de votre article principal.\n\nPhrases courtes, ton factuel, vocabulaire militaire.\n\nUtilisez <b>le gras</b> pour les noms de lieux et unités.', x: c1x, y: colY, w: col3W, h: 200 })
    b.push({ id: 'photo1', type: 'image', content: '', x: c1x, y: colY + 210, w: col3W, h: 130 })
    b.push({ id: 'photo1-cap', type: 'text', content: '<i>Légende photo 1</i>', x: c1x, y: colY + 345, w: col3W, h: 16 })

    // Col 2 : article secondaire + photo
    b.push({ id: 'col2-title', type: 'title', content: '<b>Article secondaire</b>', x: c2x, y: colY, w: col3W, h: 24 })
    b.push({ id: 'col2-rule', type: 'separator', content: '', x: c2x, y: colY + 28, w: col3W, h: 2 })
    b.push({ id: 'col2-text', type: 'text', content: 'Texte du deuxième article. Sujet connexe, opération secondaire, informations logistiques...', x: c2x, y: colY + 36, w: col3W, h: 100 })
    b.push({ id: 'photo2', type: 'image', content: '', x: c2x, y: colY + 145, w: col3W, h: 130 })
    b.push({ id: 'photo2-cap', type: 'text', content: '<i>Légende photo 2</i>', x: c2x, y: colY + 280, w: col3W, h: 16 })
    b.push({ id: 'col2-text2', type: 'text', content: 'Suite du texte après la photo...', x: c2x, y: colY + 302, w: col3W, h: 60 })

    // Col 3 : brèves
    b.push({ id: 'col3-title', type: 'title', content: '<b>Kurzmeldungen</b>', x: c3x, y: colY, w: col3W, h: 24 })
    b.push({ id: 'col3-rule', type: 'separator', content: '', x: c3x, y: colY + 28, w: col3W, h: 2 })
    b.push({ id: 'col3-breve1', type: 'text', content: '<b>Nouvelles recrues</b>\nListe des dernières incorporations au sein du Korps.', x: c3x, y: colY + 36, w: col3W, h: 60 })
    b.push({ id: 'col3-breve2', type: 'text', content: '<b>Décorations</b>\nSoldats distingués cette semaine.', x: c3x, y: colY + 104, w: col3W, h: 50 })
    b.push({ id: 'col3-breve3', type: 'text', content: '<b>Avis de service</b>\nInformations administratives et rappels importants.', x: c3x, y: colY + 162, w: col3W, h: 50 })
    b.push({ id: 'col3-sep', type: 'separator', content: '', x: c3x, y: colY + 220, w: col3W, h: 2 })
    b.push({ id: 'col3-encadre', type: 'text', content: '<b>⚠ AVIS IMPORTANT</b>\n\nContenu de l\'avis officiel ou information prioritaire à transmettre aux troupes.', x: c3x, y: colY + 230, w: col3W, h: 80 })

    y = colY + 375

    // ═══ SECTION BAS — 2 colonnes ═══
    b.push({ id: 'mid-rule', type: 'separator', content: '', x: M, y, w: CW, h: 3 })
    y += 12
    b.push({ id: 'bot-title', type: 'title', content: '<b>Troisième article</b>', x: M, y, w: CW, h: 28 })
    y += 34
    b.push({ id: 'bot-rule', type: 'separator', content: '', x: M, y, w: CW, h: 2 })
    y += 10

    const botY = y
    b.push({ id: 'bot-col1', type: 'text', content: 'Corps de texte du troisième article. Mise en page plus large sur deux colonnes, comme dans les vrais journaux de campagne.', x: M, y: botY, w: col2W, h: 130 })
    b.push({ id: 'photo3', type: 'image', content: '', x: M + col2W + gap, y: botY, w: col2W, h: 130 })
    b.push({ id: 'photo3-cap', type: 'text', content: '<i>Légende photo 3</i>', x: M + col2W + gap, y: botY + 135, w: col2W, h: 16 })
    y = botY + 160

    // ═══ FOOTER ═══
    b.push({ id: 'footer-rule', type: 'separator', content: '', x: M, y, w: CW, h: 4 })
    y += 10
    b.push({ id: 'footer', type: 'text', content: '<i>Feldzeitung des 7. Armeekorps — Nur für den Dienstgebrauch — Nachdruck verboten</i>', x: M, y, w: CW, h: 18 })

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
