import { useState, useEffect } from 'react'
import { useAuth } from '../auth/useAuth'
import api from '../api/client'
import SignatureCanvas from './SignatureCanvas'
import EffectifAutocomplete from './EffectifAutocomplete'

/**
 * SignaturePopup — Sign, stamp, or both (superposed)
 */
export default function SignaturePopup({ onClose, onSign, onRequestSent, documentType, documentId, documentLabel, slotLabel, hideRequest, hideSelf, hideStamp }) {
  const { user } = useAuth()
  const [mode, setMode] = useState(null) // null | 'self' | 'stamp' | 'both' | 'request'
  const [mySignature, setMySignature] = useState(null)
  const [tampons, setTampons] = useState([])
  const [selectedTampon, setSelectedTampon] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  // Request form
  const [requestTarget, setRequestTarget] = useState(null)
  const [requestText, setRequestText] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (user?.effectif_id) {
      api.get(`/effectifs/${user.effectif_id}/signature`).then(r => {
        if (r.data?.signature_data) setMySignature(r.data.signature_data)
      }).catch(() => {})
    }
    // Load available tampons
    api.get('/bibliotheque/my-tampons').then(r => {
      setTampons(r.data.data || [])
    }).catch(() => {})
  }, [user])

  // Compose stamp+signature into a single image
  const compositeImage = (signatureData, tamponData) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 150
      const ctx = canvas.getContext('2d')

      const loadImg = (src) => new Promise((res) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => res(img)
        img.onerror = () => res(null)
        img.src = src
      })

      Promise.all([
        tamponData ? loadImg(tamponData) : null,
        signatureData ? loadImg(signatureData) : null
      ]).then(([stampImg, sigImg]) => {
        if (stampImg) {
          const scale = Math.min(canvas.width / stampImg.width, canvas.height / stampImg.height, 1)
          const w = stampImg.width * scale
          const h = stampImg.height * scale
          ctx.globalAlpha = 0.7
          ctx.drawImage(stampImg, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
          ctx.globalAlpha = 1
        }
        if (sigImg) {
          const scale = Math.min(canvas.width / sigImg.width, canvas.height / sigImg.height, 1)
          const w = sigImg.width * scale
          const h = sigImg.height * scale
          ctx.drawImage(sigImg, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
        }
        resolve(canvas.toDataURL('image/png'))
      })
    })
  }

  const handleSignSelf = async (signatureData) => {
    if (user?.effectif_id && signatureData) {
      api.put(`/effectifs/${user.effectif_id}/signature`, { signature_data: signatureData }).catch(() => {})
      setMySignature(signatureData)
    }
    if (onSign) onSign(signatureData)
  }

  const handleUseSaved = () => {
    if (onSign) onSign(mySignature)
  }

  const handleStampOnly = () => {
    if (!selectedTampon) return
    if (onSign) onSign(selectedTampon.image_data)
  }

  const handleBoth = async (signatureData) => {
    if (!selectedTampon) return
    if (user?.effectif_id && signatureData) {
      api.put(`/effectifs/${user.effectif_id}/signature`, { signature_data: signatureData }).catch(() => {})
      setMySignature(signatureData)
    }
    const composite = await compositeImage(signatureData, selectedTampon.image_data)
    if (onSign) onSign(composite)
  }

  const handleBothSaved = async () => {
    if (!selectedTampon || !mySignature) return
    const composite = await compositeImage(mySignature, selectedTampon.image_data)
    if (onSign) onSign(composite)
  }

  const handleSendRequest = async () => {
    if (!requestTarget && !requestText) return setMessage({ type: 'error', text: 'Sélectionnez un destinataire' })
    setSending(true)
    try {
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
      const target = requestTarget || {}
      await api.post('/telegrammes', {
        destinataires: [{
          effectif_id: target.id || null,
          nom_libre: target.id ? `${target.prenom} ${target.nom}` : (target.nom_libre || requestText)
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
      setMessage({ type: 'error', text: err.response?.data?.message || "Erreur lors de l'envoi" })
    }
    setSending(false)
  }

  const TamponPicker = ({ onSelect }) => (
    <div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Choisir un tampon :</div>
      {tampons.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aucun tampon disponible pour vous.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, maxHeight: 200, overflow: 'auto' }}>
          {tampons.map(t => (
            <div key={t.id}
              onClick={() => onSelect(t)}
              style={{
                border: selectedTampon?.id === t.id ? '2px solid var(--military-green)' : '1px solid var(--border-color)',
                borderRadius: 6, padding: 6, cursor: 'pointer', textAlign: 'center',
                background: selectedTampon?.id === t.id ? 'rgba(75,83,32,0.1)' : 'transparent'
              }}>
              <img src={t.image_data} alt={t.nom} style={{ maxWidth: '100%', maxHeight: 60, objectFit: 'contain' }} />
              <div style={{ fontSize: '0.65rem', marginTop: 4, color: 'var(--text-muted)' }}>{t.nom}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Preview of stamp + signature combined
  const PreviewComposite = () => {
    if (!selectedTampon) return null
    const sig = mySignature
    return (
      <div style={{ textAlign: 'center', margin: '12px 0', position: 'relative', display: 'inline-block' }}>
        <div style={{ position: 'relative', width: 200, height: 100, margin: '0 auto' }}>
          <img src={selectedTampon.image_data} alt="tampon" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.7 }} />
          {sig && <img src={sig} alt="signature" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }} />}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Aperçu superposé</div>
      </div>
    )
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
                ✍️ Signature seule
              </button>
            )}
            {!hideStamp && tampons.length > 0 && (
              <button className="btn btn-secondary" onClick={() => setMode('stamp')} style={{ padding: '14px 20px', fontSize: '1rem' }}>
                🔴 Tampon seul
              </button>
            )}
            {!hideSelf && !hideStamp && tampons.length > 0 && (
              <button className="btn btn-secondary" onClick={() => setMode('both')} style={{ padding: '14px 20px', fontSize: '1rem' }}>
                🔴✍️ Tampon + Signature (superposés)
              </button>
            )}
            {!hideRequest && (
              <button className="btn btn-secondary" onClick={() => setMode('request')} style={{ padding: '14px 20px', fontSize: '1rem' }}>
                📨 Demander une signature par télégramme
              </button>
            )}
          </div>
        )}

        {/* Signature only */}
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
                <SignatureCanvas onDone={handleSignSelf} onCancel={() => setMode(null)} width={480} height={180} />
              </div>
            )}
            <button className="btn btn-secondary btn-small" onClick={() => setMode(null)} style={{ marginTop: 8 }}>← Retour</button>
          </div>
        )}

        {/* Stamp only */}
        {mode === 'stamp' && (
          <div>
            <TamponPicker onSelect={setSelectedTampon} />
            {selectedTampon && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={handleStampOnly}>✓ Apposer le tampon</button>
                <button className="btn btn-secondary" onClick={() => setMode(null)}>← Retour</button>
              </div>
            )}
            {!selectedTampon && (
              <button className="btn btn-secondary" onClick={() => setMode(null)} style={{ marginTop: 12 }}>← Retour</button>
            )}
          </div>
        )}

        {/* Stamp + Signature */}
        {mode === 'both' && (
          <div>
            <TamponPicker onSelect={setSelectedTampon} />
            {selectedTampon && (
              <div style={{ marginTop: 16 }}>
                <PreviewComposite />
                {mySignature && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Votre signature enregistrée :</div>
                    <div style={{ background: '#f9f6f0', border: '1px solid var(--border-color)', borderRadius: 4, padding: 8, textAlign: 'center' }}>
                      <img src={mySignature} alt="sig" style={{ maxHeight: 50, maxWidth: 200 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button className="btn btn-primary btn-small" onClick={handleBothSaved}>✓ Tampon + signature enregistrée</button>
                      <button className="btn btn-secondary btn-small" onClick={() => setMySignature(null)}>🔄 Redessiner</button>
                    </div>
                  </div>
                )}
                {!mySignature && (
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>Dessinez votre signature :</div>
                    <SignatureCanvas onDone={handleBoth} onCancel={() => setMode(null)} width={480} height={180} />
                  </div>
                )}
              </div>
            )}
            <button className="btn btn-secondary btn-small" onClick={() => setMode(null)} style={{ marginTop: 8 }}>← Retour</button>
          </div>
        )}

        {/* Request signature */}
        {mode === 'request' && (
          <div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Destinataire de la demande</label>
              <EffectifAutocomplete
                value={requestText}
                onChange={(text, eff) => { setRequestText(text); if (eff) setRequestTarget(eff); else setRequestTarget({ nom_libre: text }) }}
                onSelect={(eff) => { setRequestTarget(eff); setRequestText(`${eff.prenom} ${eff.nom}`) }}
                placeholder="Rechercher un effectif..."
              />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Message (optionnel)</label>
              <textarea className="form-input" rows={3} value={requestMessage} onChange={e => setRequestMessage(e.target.value)} placeholder="Ex: Merci de signer le soldbuch en tant que référent..." />
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
