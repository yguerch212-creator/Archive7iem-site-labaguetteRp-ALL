import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import LayoutEditor from '../../components/LayoutEditor'
import { formatDate } from '../../utils/dates'

const TYPE_LABELS = {
  'Proces-verbal': '📋 Procès-verbal',
  'Temoignage': '🗣️ Témoignage',
  'Decision': '⚖️ Décision',
  'Rapport-infraction': '📝 Rapport d\'infraction',
  'Piece-a-conviction': '🔍 Pièce à conviction',
  'Requisitoire': '📜 Réquisitoire',
  'Note-interne': '📌 Note interne',
  'Autre': '📄 Autre',
}

export default function PieceLayout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [piece, setPiece] = useState(null)
  const [initialBlocks, setInitialBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    Promise.all([
      api.get(`/affaires/pieces/${id}`),
      api.get(`/affaires/pieces/${id}/layout`),
    ]).then(([pRes, lRes]) => {
      const p = pRes.data
      setPiece(p)
      const ld = lRes.data.data
      if (ld?.layout_json) {
        const parsed = typeof ld.layout_json === 'string' ? JSON.parse(ld.layout_json) : ld.layout_json
        setInitialBlocks(parsed.blocks || [])
      } else {
        // Default template
        setInitialBlocks([
          { id: 'd1', type: 'title', x: 40, y: 20, w: 720, h: 50, content: TYPE_LABELS[p.type] || p.type },
          { id: 'd2', type: 'text', x: 40, y: 80, w: 720, h: 30, content: `<strong>${p.titre}</strong>`, style: 'handwritten' },
          { id: 'd3', type: 'separator', x: 40, y: 120, w: 720, h: 4 },
          { id: 'd4', type: 'text', x: 40, y: 140, w: 350, h: 24, content: `Affaire : ${p.affaire_numero || '—'}` },
          { id: 'd5', type: 'text', x: 420, y: 140, w: 340, h: 24, content: `Date RP : ${p.date_rp || '—'}` },
          { id: 'd6', type: 'text', x: 40, y: 170, w: 350, h: 24, content: `Rédigé par : ${p.redige_par_nom || '—'}` },
          { id: 'd7', type: 'text', x: 420, y: 170, w: 340, h: 24, content: `Date IRL : ${p.date_irl ? formatDate(p.date_irl) : '—'}` },
          { id: 'd8', type: 'separator', x: 40, y: 204, w: 720, h: 4 },
          { id: 'd9', type: 'text', x: 40, y: 220, w: 720, h: 600, content: p.contenu || '' },
        ])
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const handleSave = async (html, blocks) => {
    try {
      await api.put(`/affaires/pieces/${id}/layout`, { layout: { blocks } })
      setMsg('💾 Sauvegardé ✓')
      setTimeout(() => setMsg(''), 2000)
    } catch { setMsg('❌ Erreur de sauvegarde') }
  }

  const handlePublish = async (html, blocks) => {
    try {
      await api.put(`/affaires/pieces/${id}/layout`, { layout: { blocks }, html_published: html })
      setMsg('✅ Publié ✓')
      setTimeout(() => navigate(`/pieces/${id}`), 1000)
    } catch { setMsg('❌ Erreur') }
  }

  if (loading) return <div className="container"><p style={{ textAlign: 'center', padding: 40 }}>Chargement...</p></div>
  if (!piece) return <div className="container"><p style={{ textAlign: 'center', padding: 40 }}>Pièce introuvable</p></div>

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton />
        {msg && <div className="alert alert-success" style={{ margin: 0, padding: '6px 16px' }}>{msg}</div>}
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-sm)' }}>🖊️ Mise en page — Pièce</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)', fontSize: '0.85rem' }}>
        {TYPE_LABELS[piece.type]} — {piece.titre}
      </p>

      <LayoutEditor
        blocks={initialBlocks}
        onSave={handleSave}
        onPublish={handlePublish}
        title={`${piece.type} — ${piece.titre}`}
        affaireId={piece.affaire_id}
      />
    </div>
  )
}
