import { useState, useEffect } from 'react'
import { useAuth } from '../auth/useAuth'
import api from '../api/client'
import SignatureCanvas from './SignatureCanvas'
import EffectifAutocomplete from './EffectifAutocomplete'

/**
 * SignaturePopup — Popup to sign a document or request a signature via télégramme
 * 
 * Props:
 *   onClose() — close popup
 *   onSign(signatureData) — called when user signs themselves
 *   onRequestSent() — called after télégramme sent (optional)
 *   documentType — 'soldbuch' | 'rapport' | 'visite' | 'affaire' | 'piece'
 *   documentId — id of the document
 *   documentLabel — display name (e.g. "Soldbuch de Hans Müller")
 *   slotLabel — which signature slot (e.g. "Signature du soldat", "Signature du référent")
 *   hideRequest — if true, hide the "request via telegram" option
 *   hideSelf — if true, hide the "sign myself" option
 */
export default function SignaturePopup({ onClose, onSign, onRequestSent, documentType, documentId, documentLabel, slotLabel, hideRequest, hideSelf }) {
  const { user } = useAuth()
  const [mode, setMode] = useState(null) // null | 'self' | 'request'
  const [mySignature, setMySignature] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  // Request form
  const [requestTarget, setRequestTarget] = useState(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (user?.effectif_id) {
      api.get(`/effectifs/${user.effectif_id}/signature`).then(r => {
        if (r.data?.signature_data) setMySignature(r.data.signature_data)
      }).catch(() => {})
    }
  }, [user])

  const handleSignSelf = async (signatureData) => {
    // Save personal signature
    if (user?.effectif_id && signatureData) {
      api.put(`/effectifs/${user.effectif_id}/signature`, { signature_data: signatureData }).catch(() => {})
      setMySignature(signatureData)
    }
    if (onSign) onSign(signatureData)
  }

  const handleUseSaved = () => {
    if (onSign) onSign(mySignature)
  }

  const handleSendRequest = async () => {
    if (!requestTarget) return setMessage({ type: 'error', text: 'Sélectionnez un destinataire' })
    setSending(true)

    try {
      // Build the document URL path
      const pathMap = {
        soldbuch: `/effectifs/${documentId}/soldbuch`,
        rapport: `/rapports/${documentId}`,
        visite: `/medical/${documentId}`,
        affaire: `/sanctions/${documentId}`,
        piece: `/sanctions/piece/${documentId}`
      }
      const docPath = pathMap[documentType] || '/'

      const contenu = [
        `Demande de signature pour : ${documentLabel || 'Document'}`,
        slotLabel ? `Emplacement : ${slotLabel}` : '',
        requestMessage ? `\nMessage : ${requestMessage}` : '',
        `\nLien : ${window.location.origin}${docPath}`
      ].filter(Boolean).join('\n')

      await api.post('/telegrammes', {
        destinataires: [{
          effectif_id: requestTarget.id || null,
          nom_libre: requestTarget.display || requestTarget.nom_libre || `${requestTarget.prenom || ''} ${requestTarget.nom || ''}`.trim()
        }],
        objet: `✍️ Demande de signature — ${documentLabel || 'Document'}`,
        contenu,
        priorite: 'Normal',
        prive: true
      })

      setMessage({ type: 'success', text: '📨 Télégramme de demande envoyé !' })
      setTimeout(() => {
        if (onRequestSent) onRequestSent()
        onClose()
      }, 1500)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de l\'envoi' })
    }
    setSending(false)
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <button className="popup-close" onClick={onClose}>✕</button>
        <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>✍️ Signer le document</h3>
        {slotLabel && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>{slotLabel}</div>}

        {message && <div className={`alert alert-${message.type}`} style={{ marginBottom: 12 }}>{message.text}</div>}

        {/* Mode selection */}
        {!mode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!hideSelf && (
              <button className="btn btn-primary" onClick={() => setMode('self')} style={{ padding: '14px 20px', fontSize: '1rem' }}>
                ✍️ Signer moi-même
              </button>
            )}
            {!hideRequest && (
              <button className="btn btn-secondary" onClick={() => setMode('request')} style={{ padding: '14px 20px', fontSize: '1rem' }}>
                📨 Demander une signature par télégramme
              </button>
            )}
          </div>
        )}

        {/* Self-sign mode */}
        {mode === 'self' && (
          <div>
            {mySignature && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Votre signature enregistrée :</div>
                <div style={{ background: '#f9f6f0', border: '1px solid var(--border-color)', borderRadius: 4, padding: 8, textAlign: 'center' }}>
                  <img src={mySignature} alt="Ma signature" style={{ maxHeight: 60, maxWidth: 250 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-primary btn-small" onClick={handleUseSaved}>✓ Utiliser cette signature</button>
                  <button className="btn btn-secondary btn-small" onClick={() => setMySignature(null)}>🔄 Redessiner</button>
                </div>
              </div>
            )}
            {!mySignature && (
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>Dessinez votre signature :</div>
                <SignatureCanvas
                  onDone={handleSignSelf}
                  onCancel={() => setMode(null)}
                  width={480}
                  height={180}
                />
              </div>
            )}
            {mySignature && (
              <button className="btn btn-secondary btn-small" onClick={() => setMode(null)} style={{ marginTop: 8 }}>
                ← Retour
              </button>
            )}
          </div>
        )}

        {/* Request signature mode */}
        {mode === 'request' && (
          <div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Destinataire de la demande</label>
              <EffectifAutocomplete
                value={requestTarget?.display || ''}
                onChange={(val) => setRequestTarget(val)}
                placeholder="Rechercher un effectif..."
              />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Message (optionnel)</label>
              <textarea
                className="form-input"
                rows={3}
                value={requestMessage}
                onChange={e => setRequestMessage(e.target.value)}
                placeholder="Ex: Merci de signer le soldbuch en tant que référent..."
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleSendRequest} disabled={sending}>
                {sending ? '⏳ Envoi...' : '📨 Envoyer le télégramme'}
              </button>
              <button className="btn btn-secondary" onClick={() => setMode(null)}>← Retour</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
