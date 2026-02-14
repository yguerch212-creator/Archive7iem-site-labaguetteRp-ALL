import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import LayoutRenderer from '../../components/LayoutRenderer'
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

export default function PieceView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [piece, setPiece] = useState(null)
  const [layout, setLayout] = useState(null)
  const [loading, setLoading] = useState(true)

  const canEdit = user?.isAdmin || user?.isOfficier || user?.isFeldgendarmerie

  useEffect(() => {
    Promise.all([
      api.get(`/affaires/pieces/${id}`),
      api.get(`/affaires/pieces/${id}/layout`),
    ]).then(([pRes, lRes]) => {
      setPiece(pRes.data)
      const ld = lRes.data.data
      if (ld?.layout_json) {
        const parsed = typeof ld.layout_json === 'string' ? JSON.parse(ld.layout_json) : ld.layout_json
        setLayout(parsed)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading) return <div className="container"><p style={{ textAlign: 'center', padding: 40 }}>Chargement...</p></div>
  if (!piece) return <div className="container"><p style={{ textAlign: 'center', padding: 40 }}>Pièce introuvable</p></div>

  // Default template blocks if no layout saved
  const defaultBlocks = [
    { id: 'd1', type: 'title', x: 40, y: 20, w: 720, h: 50, content: TYPE_LABELS[piece.type] || piece.type },
    { id: 'd2', type: 'text', x: 40, y: 80, w: 720, h: 30, content: `<strong>${piece.titre}</strong>`, style: 'handwritten' },
    { id: 'd3', type: 'separator', x: 40, y: 120, w: 720, h: 4 },
    { id: 'd4', type: 'text', x: 40, y: 140, w: 350, h: 24, content: `Affaire : ${piece.affaire_numero || '—'}` },
    { id: 'd5', type: 'text', x: 420, y: 140, w: 340, h: 24, content: `Date RP : ${piece.date_rp || '—'}` },
    { id: 'd6', type: 'text', x: 40, y: 170, w: 350, h: 24, content: `Rédigé par : ${piece.redige_par_nom || '—'}` },
    { id: 'd7', type: 'text', x: 420, y: 170, w: 340, h: 24, content: `Date IRL : ${piece.date_irl ? formatDate(piece.date_irl) : '—'}` },
    { id: 'd8', type: 'separator', x: 40, y: 204, w: 720, h: 4 },
    { id: 'd9', type: 'text', x: 40, y: 220, w: 720, h: 600, content: piece.contenu || '<em>Aucun contenu</em>' },
  ]

  // Add signatures if present
  if (piece.signatures?.length > 0) {
    let yPos = 840
    piece.signatures.forEach((sig, i) => {
      defaultBlocks.push({
        id: `ds${i}`,
        type: sig.signe && sig.signature_data ? 'signature' : 'text',
        x: 40 + (i % 2) * 380,
        y: yPos + Math.floor(i / 2) * 100,
        w: 340,
        h: 80,
        content: sig.signe && sig.signature_data
          ? sig.signature_data
          : `${sig.role_signataire || 'Signataire'} : ${sig.nom_signataire || '—'}\n${sig.signe ? '✅ Signé' : '⏳ En attente'}`,
      })
    })
  }

  const blocks = layout?.blocks || defaultBlocks

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton />
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {canEdit && (
            <button className="btn btn-primary btn-small" onClick={() => navigate(`/pieces/${id}/layout`)}>
              🖊️ Mise en page
            </button>
          )}
          <button className="btn btn-secondary btn-small" onClick={() => {
            const el = document.getElementById('piece-render')
            if (el) { import('../../utils/exportPdf').then(m => m.exportToPdf(el, `piece-${id}`)) }
          }}>📥 PDF</button>
        </div>
      </div>

      {/* Header info */}
      <div className="paper-card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '3px solid #5a3d5a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ margin: '0 0 4px' }}>{TYPE_LABELS[piece.type] || piece.type}</h2>
            <h3 style={{ margin: 0, fontWeight: 400 }}>{piece.titre}</h3>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {piece.affaire_numero && <div>Affaire {piece.affaire_numero}</div>}
            {piece.redige_par_nom && <div>Par {piece.redige_par_nom}</div>}
            {piece.date_irl && <div>{formatDate(piece.date_irl)}</div>}
          </div>
        </div>
      </div>

      {/* Rendered document */}
      <div id="piece-render" style={{ background: '#f5f2e8', border: '1px solid var(--border-color)', borderRadius: 8, padding: 0, overflow: 'hidden' }}>
        <LayoutRenderer blocks={blocks} width={800} height={1100} />
      </div>

      {/* Signatures status */}
      {piece.signatures?.length > 0 && (
        <div className="paper-card" style={{ marginTop: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>✍️ Signatures</h3>
          <table className="table">
            <thead>
              <tr><th>Signataire</th><th>Rôle</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {piece.signatures.map((s, i) => (
                <tr key={i}>
                  <td>{s.nom_signataire || '—'}</td>
                  <td>{s.role_signataire || '—'}</td>
                  <td>{s.signe ? <span style={{ color: 'var(--success)' }}>✅ Signé</span> : <span style={{ color: 'var(--warning)' }}>⏳ En attente</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
