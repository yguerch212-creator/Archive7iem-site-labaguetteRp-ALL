import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import LayoutEditor from '../../components/LayoutEditor'

const TYPE_LABELS = { rapport: 'Rapport Journalier', recommandation: 'Recommandation', incident: "Rapport d'Incident" }

export default function RapportLayout() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rapport, setRapport] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    try {
      const res = await api.get(`/rapports/${id}`)
      const r = res.data.data
      setRapport(r)

      // Check if layout exists
      try {
        const layoutRes = await api.get(`/rapports/${id}/layout`)
        if (layoutRes.data?.blocks) {
          setBlocks(layoutRes.data.blocks)
          setLoading(false)
          return
        }
      } catch {}

      // Generate default layout from rapport data
      setBlocks(generateBlocks(r))
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const generateBlocks = (r) => {
    const b = []
    let y = 30

    // Header
    b.push({ id: 'numero', type: 'text', content: r.numero || '', x: 300, y, w: 200, h: 20 })
    y += 25
    b.push({ id: 'type', type: 'title', content: `<b>${TYPE_LABELS[r.type] || 'RAPPORT'}</b>`, x: 200, y, w: 400, h: 40 })
    y += 45
    b.push({ id: 'titre', type: 'title', content: `<b>${r.titre || ''}</b>`, x: 100, y, w: 600, h: 35 })
    y += 45
    b.push({ id: 'sep1', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
    y += 15

    // Meta
    b.push({ id: 'meta', type: 'text', content: `<b>Auteur :</b> ${r.auteur_nom || '—'}${r.auteur_grade ? ` — ${r.auteur_grade}` : ''}<br/><b>Date RP :</b> ${r.date_rp || '—'}`, x: 40, y, w: 400, h: 45 })
    y += 60

    // Content by type
    if (r.type === 'rapport') {
      if (r.contexte) { b.push({ id: 'lbl-ctx', type: 'title', content: '<b>I. CONTEXTE</b>', x: 40, y, w: 300, h: 28 }); y += 32; b.push({ id: 'ctx', type: 'text', content: r.contexte, x: 40, y, w: 700, h: 100 }); y += 115 }
      if (r.resume) { b.push({ id: 'lbl-res', type: 'title', content: '<b>II. RÉSUMÉ DES OPÉRATIONS</b>', x: 40, y, w: 400, h: 28 }); y += 32; b.push({ id: 'res', type: 'text', content: r.resume, x: 40, y, w: 700, h: 120 }); y += 135 }
      if (r.bilan) { b.push({ id: 'lbl-bil', type: 'title', content: '<b>III. BILAN</b>', x: 40, y, w: 300, h: 28 }); y += 32; b.push({ id: 'bil', type: 'text', content: r.bilan, x: 40, y, w: 700, h: 100 }); y += 115 }
      if (r.remarques) { b.push({ id: 'lbl-rem', type: 'title', content: '<b>IV. REMARQUES</b>', x: 40, y, w: 300, h: 28 }); y += 32; b.push({ id: 'rem', type: 'text', content: r.remarques, x: 40, y, w: 700, h: 80 }); y += 95 }
    } else if (r.type === 'recommandation') {
      b.push({ id: 'lbl-per', type: 'title', content: '<b>I. PERSONNE RECOMMANDÉE</b>', x: 40, y, w: 400, h: 28 }); y += 32
      b.push({ id: 'per', type: 'text', content: `${r.recommande_nom || '—'}${r.recommande_grade ? ` — ${r.recommande_grade}` : ''}`, x: 40, y, w: 400, h: 30 }); y += 45
      if (r.raison_1) { b.push({ id: 'lbl-r1', type: 'title', content: '<b>II. MOTIFS</b>', x: 40, y, w: 300, h: 28 }); y += 32; b.push({ id: 'r1', type: 'text', content: r.raison_1, x: 40, y, w: 700, h: 100 }); y += 115 }
      if (r.recompense) { b.push({ id: 'lbl-rec', type: 'title', content: '<b>III. RÉCOMPENSE PROPOSÉE</b>', x: 40, y, w: 400, h: 28 }); y += 32; b.push({ id: 'rec', type: 'text', content: r.recompense, x: 40, y, w: 500, h: 60 }); y += 75 }
    } else if (r.type === 'incident') {
      b.push({ id: 'lbl-intro', type: 'title', content: '<b>I. INTRODUCTION</b>', x: 40, y, w: 300, h: 28 }); y += 32
      b.push({ id: 'intro', type: 'text', content: `${r.intro_nom || '—'}${r.intro_grade ? ` — ${r.intro_grade}` : ''}${r.lieu_incident ? `<br/>Lieu : ${r.lieu_incident}` : ''}`, x: 40, y, w: 400, h: 50 }); y += 65
      b.push({ id: 'lbl-mc', type: 'title', content: '<b>II. MISE EN CAUSE</b>', x: 40, y, w: 300, h: 28 }); y += 32
      b.push({ id: 'mc', type: 'text', content: `${r.mise_en_cause_nom || '—'}${r.mise_en_cause_grade ? ` — ${r.mise_en_cause_grade}` : ''}`, x: 40, y, w: 400, h: 30 }); y += 45
      if (r.compte_rendu) { b.push({ id: 'lbl-cr', type: 'title', content: '<b>III. COMPTE RENDU</b>', x: 40, y, w: 300, h: 28 }); y += 32; b.push({ id: 'cr', type: 'text', content: r.compte_rendu, x: 40, y, w: 700, h: 120 }); y += 135 }
    }

    // Separator + Signature
    b.push({ id: 'sep2', type: 'separator', content: '', x: 40, y, w: 720, h: 4 }); y += 20
    b.push({ id: 'sig', type: 'signature', content: `${r.signature_nom || r.auteur_nom || ''} — ${r.signature_grade || r.auteur_grade || ''}`, x: 450, y, w: 300, h: 50 })
    y += 60
    b.push({ id: 'footer', type: 'text', content: '📜 Archives 7e Armeekorps', x: 250, y, w: 300, h: 25 })

    return b
  }

  const handleSave = async (newBlocks) => {
    try {
      await api.put(`/rapports/${id}/layout`, { blocks: newBlocks })
      setMessage('💾 Sauvegardé')
      setTimeout(() => setMessage(''), 2000)
    } catch (err) { setMessage('❌ Erreur') }
  }

  const handlePublish = async (html, publishedBlocks) => {
    try {
      // Save layout blocks + publish HTML
      await api.put(`/rapports/${id}/layout`, { blocks: publishedBlocks || blocks, html_published: html })
      await api.put(`/rapports/${id}/publish`, { contenu_html: html })
      setMessage('📜 Rapport publié ! Redirection...')
      setTimeout(() => navigate(`/rapports/${id}`), 1500)
    } catch (err) { setMessage('❌ Erreur') }
  }

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>
  if (!rapport) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Rapport introuvable</div>

  return (
    <div style={{ padding: '1rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <BackButton label="← Retour au rapport" />
        {message && (
            <div className={`alert ${message.includes('❌') ? 'alert-danger' : 'alert-success'}`} style={{ margin: '0.5rem 0', textAlign: 'center', fontWeight: 600 }}>
              {message}
            </div>
          )}
      </div>
      <LayoutEditor
        blocks={blocks}
        onSave={handleSave}
        onPublish={handlePublish}
        title={`${TYPE_LABELS[rapport.type] || 'Rapport'} — ${rapport.titre || ''}`}
      />
    </div>
  )
}
