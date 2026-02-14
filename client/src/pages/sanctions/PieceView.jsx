import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import SignatureCanvas from '../../components/SignatureCanvas'
import { formatDate } from '../../utils/dates'
import { exportToPdf } from '../../utils/exportPdf'

const TYPE_LABELS = {
  'Proces-verbal': 'PROCÈS-VERBAL',
  'Temoignage': 'TÉMOIGNAGE',
  'Decision': 'DÉCISION',
  'Rapport-infraction': "RAPPORT D'INFRACTION",
  'Piece-a-conviction': 'PIÈCE À CONVICTION',
  'Requisitoire': 'RÉQUISITOIRE',
  'Note-interne': 'NOTE INTERNE',
  'Autre': 'DOCUMENT',
}

export default function PieceView() {
  const { id } = useParams()
  const { user } = useAuth()
  const [piece, setPiece] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSign, setShowSign] = useState(null)
  const [mySignature, setMySignature] = useState(null)
  const [msg, setMsg] = useState('')

  // Load saved signature for current user
  useEffect(() => {
    if (user?.effectif_id) {
      api.get(`/effectifs/${user.effectif_id}/signature`).then(r => {
        if (r.data?.signature_data) setMySignature(r.data.signature_data)
      }).catch(() => {})
    }
  }, [user?.effectif_id])

  const load = () => {
    api.get(`/affaires/pieces/${id}`).then(r => {
      setPiece(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleSign = async (dataUrl) => {
    if (!showSign) return
    try {
      await api.put(`/affaires/signatures/${showSign}/sign`, { signature_data: dataUrl })
      // Save signature for future reuse
      if (user?.effectif_id) {
        await api.put(`/effectifs/${user.effectif_id}/signature`, { signature_data: dataUrl }).catch(() => {})
        setMySignature(dataUrl)
      }
      setShowSign(null)
      setMsg('✅ Signature apposée')
      setTimeout(() => setMsg(''), 3000)
      load()
    } catch { setMsg('❌ Erreur') }
  }

  const autoSign = async (sigId) => {
    if (!mySignature) { setShowSign(sigId); return }
    try {
      await api.put(`/affaires/signatures/${sigId}/sign`, { signature_data: mySignature })
      setMsg('✅ Signature apposée automatiquement')
      setTimeout(() => setMsg(''), 3000)
      load()
    } catch { setMsg('❌ Erreur') }
  }

  const sendTelegram = async (sig) => {
    try {
      await api.post(`/affaires/signatures/${sig.id}/telegram`)
      setMsg('⚡ Télégramme envoyé')
      setTimeout(() => setMsg(''), 3000)
    } catch { setMsg('❌ Erreur envoi télégramme') }
  }

  if (loading) return <div className="container"><p style={{ textAlign: 'center', padding: 40 }}>Chargement...</p></div>
  if (!piece) return <div className="container"><p style={{ textAlign: 'center', padding: 40 }}>Pièce introuvable</p></div>

  const p = piece
  const canSign = (sig) => sig.effectif_id === user?.effectif_id && !sig.signe

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton />
        <button className="btn btn-secondary btn-small" onClick={() => exportToPdf('piece-doc', `${p.type}_${p.titre?.replace(/\s/g, '_')}`)}>📥 PDF</button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      {/* ═══ Document ═══ */}
      <div id="piece-doc" style={{
        background: '#f5f2e8',
        border: '1px solid #c4b99a',
        borderRadius: 4,
        padding: '60px 70px',
        maxWidth: 820,
        margin: '0 auto',
        fontFamily: "'IBM Plex Mono', monospace",
        position: 'relative',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
      }}>
        {/* Watermark */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-30deg)', fontSize: '5rem', opacity: 0.03, fontWeight: 900, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          7. ARMEEKORPS
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40, borderBottom: '2px solid #3d5a3e', paddingBottom: 20 }}>
          <div style={{ fontSize: '0.75rem', color: '#666', letterSpacing: 3, marginBottom: 8 }}>ARCHIVES DU 7. ARMEEKORPS</div>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.6rem', letterSpacing: 2, color: '#3d5a3e' }}>
            {TYPE_LABELS[p.type] || p.type}
          </h1>
          <div style={{ fontSize: '0.85rem', color: '#555' }}>{p.confidentiel ? '🔒 CONFIDENTIEL — ' : ''}Affaire {p.affaire_numero || '—'}</div>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30, fontSize: '0.82rem', color: '#555' }}>
          <div>
            <div><strong>Titre :</strong> {p.titre}</div>
            <div><strong>Rédigé par :</strong> {p.redige_par_nom || '—'}</div>
            {p.infraction_nom && <div><strong>Infraction :</strong> {p.infraction_nom} (Groupe {p.infraction_groupe})</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div><strong>Date RP :</strong> {p.date_rp || '—'}</div>
            <div><strong>Date IRL :</strong> {p.date_irl ? formatDate(p.date_irl) : '—'}</div>
          </div>
        </div>

        {/* Separator */}
        <div style={{ borderTop: '1px solid #999', margin: '0 0 30px' }} />

        {/* Content */}
        <div style={{ fontSize: '0.88rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', minHeight: 200, color: '#333' }}>
          {p.contenu || 'Aucun contenu.'}
        </div>

        {/* Separator */}
        <div style={{ borderTop: '1px solid #999', margin: '40px 0 30px' }} />

        {/* Signatures */}
        {p.signatures?.length > 0 && (
          <div>
            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 16, letterSpacing: 2 }}>SIGNATURES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {p.signatures.map((sig, i) => (
                <div key={i} style={{ flex: '1 1 250px', border: '1px solid #c4b99a', borderRadius: 4, padding: 16, textAlign: 'center', background: '#faf8f2' }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>{sig.role_signataire || 'Signataire'}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>{sig.nom_signataire || '—'}</div>
                  {sig.signe && sig.signature_data ? (
                    <img src={sig.signature_data} alt="Signature" style={{ maxWidth: '100%', maxHeight: 80 }} />
                  ) : (
                    <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.8rem', fontStyle: 'italic', border: '1px dashed #ccc', borderRadius: 4 }}>
                      En attente de signature
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, textAlign: 'center', fontSize: '0.7rem', color: '#999', borderTop: '1px solid #ddd', paddingTop: 12 }}>
          Document émis dans le cadre de la procédure judiciaire — {p.affaire_numero || ''} — Archives 7. Armeekorps
        </div>
      </div>

      {/* ═══ Actions hors document ═══ */}
      {p.signatures?.length > 0 && (
        <div className="paper-card" style={{ marginTop: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>✍️ Signatures</h3>
          <table className="table">
            <thead>
              <tr><th>Signataire</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {p.signatures.map((sig, i) => (
                <tr key={i}>
                  <td>{sig.nom_signataire || '—'}</td>
                  <td>{sig.role_signataire || '—'}</td>
                  <td>{sig.signe ? <span style={{ color: 'var(--success)' }}>✅ Signé</span> : <span style={{ color: 'var(--warning)' }}>⏳ En attente</span>}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    {canSign(sig) && (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => autoSign(sig.id)}>
                          {mySignature ? '✍️ Signer' : '✍️ Dessiner & Signer'}
                        </button>
                        {mySignature && <button className="btn btn-sm btn-secondary" onClick={() => setShowSign(sig.id)} title="Redessiner">🔄</button>}
                      </>
                    )}
                    {!sig.signe && !canSign(sig) && (user?.isAdmin || user?.isOfficier || user?.isFeldgendarmerie) && (
                      <button className="btn btn-sm btn-secondary" onClick={() => sendTelegram(sig)}>⚡ Télégramme</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Signature modal */}
      {showSign && (
        <div className="popup-overlay" onClick={() => setShowSign(null)}>
          <div className="popup-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <button className="popup-close" onClick={() => setShowSign(null)}>✕</button>
            <h3 style={{ margin: '0 0 16px' }}>✍️ Apposer votre signature</h3>
            <SignatureCanvas onSave={handleSign} width={480} height={200} />
          </div>
        </div>
      )}
    </div>
  )
}
