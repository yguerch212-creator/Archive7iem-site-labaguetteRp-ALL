import BackButton from '../../components/BackButton'
import LayoutRenderer from '../../components/LayoutRenderer'
import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import apiClient from '../../api/client'
import { exportToPdf } from '../../utils/exportPdf'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'
import SignatureCanvas from '../../components/SignatureCanvas'

const TYPE_LABELS = { rapport: 'Rapport Journalier', recommandation: 'Recommandation', incident: 'Rapport d\'Incident' }
const STAMPS = [
  { id: 'tempon916', label: '916. Grenadier', url: '/assets/stamps/tempon916.png' },
]

export default function RapportView() {
  const { id } = useParams()
  const { user } = useAuth()
  const [rapport, setRapport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPublish, setShowPublish] = useState(false)
  const [pubForm, setPubForm] = useState({ signature_nom: '', signature_grade: '', stamp: '', signature_canvas: '' })
  const [savedSig, setSavedSig] = useState(null)
  const sigCanvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSig, setHasSig] = useState(false)
  const [message, setMessage] = useState(null)
  const [layoutBlocks, setLayoutBlocks] = useState(null)
  const [mySignature, setMySignature] = useState(null)
  const [showValidateSign, setShowValidateSign] = useState(false)

  const canPublish = user?.isAdmin || user?.isOfficier || user?.isRecenseur

  useEffect(() => {
    load()
    // Load saved signature
    apiClient.get('/affaires/my-signature').then(r => {
      if (r.data.data) { setSavedSig(r.data.data); setMySignature(r.data.data); setPubForm(p => ({...p, signature_canvas: r.data.data})) }
    }).catch(() => {})
    if (user?.effectif_id) {
      apiClient.get(`/effectifs/${user.effectif_id}/signature`).then(r => {
        if (r.data?.signature_data) setMySignature(r.data.signature_data)
      }).catch(() => {})
    }
    // Load saved layout
    apiClient.get(`/rapports/${id}/layout`).then(r => {
      if (r.data.blocks && r.data.blocks.length > 0) setLayoutBlocks(r.data.blocks)
    }).catch(() => {})
  }, [id])

  const load = () => {
    apiClient.get(`/rapports/${id}`).then(r => { setRapport(r.data.data); setLoading(false) }).catch(() => setLoading(false))
  }

  const autoPublish = async () => {
    try {
      // Generate HTML from the paper content
      const el = document.getElementById('rapport-paper')
      const html = el ? el.innerHTML : ''
      await apiClient.put(`/rapports/${id}/publish`, {
        contenu_html: html,
        signature_nom: pubForm.signature_nom,
        signature_grade: pubForm.signature_grade,
        stamp: pubForm.stamp
      })
      setMessage({ type: 'success', text: 'Rapport publié ✓' })
      setShowPublish(false)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const canValidate = rapport && !rapport.valide && (
    (rapport.auteur_rang < 35 && (user?.grade_rang >= 35 || user?.isAdmin)) ||
    (rapport.auteur_rang >= 35 && rapport.auteur_rang < 60 && (user?.grade_rang >= 60 || user?.isOfficier || user?.isAdmin))
  )

  const validateRapport = async (signatureData) => {
    try {
      await apiClient.put(`/rapports/${id}/validate`, { signature_data: signatureData || mySignature || null })
      // Save signature if new
      if (signatureData && user?.effectif_id) {
        await apiClient.put(`/effectifs/${user.effectif_id}/signature`, { signature_data: signatureData }).catch(() => {})
        setMySignature(signatureData)
      }
      setShowValidateSign(false)
      setMessage({ type: 'success', text: '✅ Rapport validé' })
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const handleValidateClick = () => {
    if (mySignature) {
      validateRapport(mySignature)
    } else {
      setShowValidateSign(true)
    }
  }

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>
  if (!rapport) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Rapport introuvable</div>

  const R = rapport
  const fmtDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('fr-FR') : '—'

  return (
    <div className="container" style={{ maxWidth: 900, paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
        <BackButton label="← Retour" />
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <Link to={`/rapports/${id}/layout`} className="btn btn-secondary btn-small">🖋️ Mise en page</Link>
          {canPublish && !R.published && (
            <button className="btn btn-primary btn-small" onClick={() => setShowPublish(!showPublish)}>
              {showPublish ? '✕' : '📜 Publier'}
            </button>
          )}
        </div>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {/* Publish form */}
      {showPublish && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>📜 Publier le rapport</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ajoute une signature et un tampon, puis publie le rapport en l'état.</p>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Signataire</label>
              <EffectifAutocomplete
                value={pubForm.signature_nom}
                onChange={val => setPubForm(p => ({...p, signature_nom: val}))}
                onSelect={eff => setPubForm(p => ({...p, signature_nom: `${eff.prenom} ${eff.nom}`, signature_grade: eff.grade_nom || p.signature_grade}))}
                placeholder={`${user?.prenom || ''} ${user?.nom || ''}`}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Grade du signataire</label>
              <input type="text" className="form-input" value={pubForm.signature_grade} onChange={e => setPubForm(p => ({...p, signature_grade: e.target.value}))} placeholder={user?.grade_nom || 'Grade...'} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tampon</label>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <label style={{ cursor: 'pointer', border: pubForm.stamp === '' ? '2px solid var(--military-green)' : '2px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 'var(--space-sm)', textAlign: 'center', minWidth: 80 }}>
                <input type="radio" name="stamp" value="" checked={pubForm.stamp === ''} onChange={() => setPubForm(p => ({...p, stamp: ''}))} style={{ display: 'none' }} />
                <div style={{ fontSize: '0.8rem' }}>Aucun</div>
              </label>
              {STAMPS.map(s => (
                <label key={s.id} style={{ cursor: 'pointer', border: pubForm.stamp === s.id ? '2px solid var(--military-green)' : '2px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 'var(--space-sm)', textAlign: 'center' }}>
                  <input type="radio" name="stamp" value={s.id} checked={pubForm.stamp === s.id} onChange={() => setPubForm(p => ({...p, stamp: s.id}))} style={{ display: 'none' }} />
                  <img src={s.url} alt={s.label} style={{ height: 50, opacity: 0.7 }} /><br/>
                  <span style={{ fontSize: '0.7rem' }}>{s.label}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Signature manuscrite */}
          <div className="form-group">
            <label className="form-label">✍️ Signature manuscrite</label>
            {savedSig ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '0.3rem', background: 'white' }}>
                  <img src={savedSig} alt="Ma signature" style={{ height: 50 }} />
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>✅ Signature sauvegardée</span>
                <button className="btn btn-sm" onClick={() => { setSavedSig(null); setPubForm(p => ({...p, signature_canvas: ''})); setHasSig(false) }}>Redessiner</button>
              </div>
            ) : (
              <div>
                <canvas ref={sigCanvasRef} width={350} height={120}
                  style={{ border: '2px solid var(--border)', borderRadius: 4, cursor: 'crosshair', background: 'white', touchAction: 'none', display: 'block' }}
                  onMouseDown={e => { e.preventDefault(); const ctx = sigCanvasRef.current.getContext('2d'); const r = sigCanvasRef.current.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(e.clientX-r.left, e.clientY-r.top); setDrawing(true) }}
                  onMouseMove={e => { if (!drawing) return; const ctx = sigCanvasRef.current.getContext('2d'); const r = sigCanvasRef.current.getBoundingClientRect(); ctx.lineTo(e.clientX-r.left, e.clientY-r.top); ctx.strokeStyle='#1a1a2e'; ctx.lineWidth=2; ctx.lineCap='round'; ctx.stroke(); setHasSig(true) }}
                  onMouseUp={() => { setDrawing(false); if (hasSig) setPubForm(p => ({...p, signature_canvas: sigCanvasRef.current.toDataURL('image/png')})) }}
                  onMouseLeave={() => setDrawing(false)}
                  onTouchStart={e => { e.preventDefault(); const ctx = sigCanvasRef.current.getContext('2d'); const r = sigCanvasRef.current.getBoundingClientRect(); const t=e.touches[0]; ctx.beginPath(); ctx.moveTo(t.clientX-r.left, t.clientY-r.top); setDrawing(true) }}
                  onTouchMove={e => { if (!drawing) return; e.preventDefault(); const ctx = sigCanvasRef.current.getContext('2d'); const r = sigCanvasRef.current.getBoundingClientRect(); const t=e.touches[0]; ctx.lineTo(t.clientX-r.left, t.clientY-r.top); ctx.strokeStyle='#1a1a2e'; ctx.lineWidth=2; ctx.lineCap='round'; ctx.stroke(); setHasSig(true) }}
                  onTouchEnd={() => { setDrawing(false); if (hasSig) setPubForm(p => ({...p, signature_canvas: sigCanvasRef.current.toDataURL('image/png')})) }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                  <button className="btn btn-sm" onClick={() => { sigCanvasRef.current.getContext('2d').clearRect(0,0,350,120); setHasSig(false); setPubForm(p => ({...p, signature_canvas: ''})) }}>🗑️ Effacer</button>
                </div>
              </div>
            )}
          </div>

          <button className="btn btn-primary" onClick={autoPublish}>📜 Publier avec mise en page auto</button>
        </div>
      )}

      {/* Document */}
      {layoutBlocks ? (
        <div className="document-paper" id="rapport-paper" style={{ minHeight: 500 }}>
          <LayoutRenderer blocks={layoutBlocks} />
        </div>
      ) : (
      <div className="document-paper" id="rapport-paper" style={{ minHeight: 500 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', borderBottom: '2px solid var(--border-color)', paddingBottom: 'var(--space-lg)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{R.numero}</div>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.3rem' }}>📜 {TYPE_LABELS[R.type] || 'RAPPORT'}</h2>
          <div style={{ fontSize: '1rem', fontWeight: 600 }}>{R.titre}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Rédigé par <strong>{R.auteur_nom || 'Inconnu'}</strong>
            {R.auteur_grade && <> — {R.auteur_grade}</>}
            {R.personne_renseignee_nom && <><br/>Personne renseignée : <strong>{R.personne_renseignee_nom}</strong></>}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Date RP : {R.date_rp || '—'} — Date IRL : {fmtDate(R.date_irl)}
          </div>
        </div>

        {/* Content by type */}
        {R.type === 'rapport' && (
          <>
            {R.contexte && <Section title="I. CONTEXTE" content={R.contexte} />}
            {R.resume && <Section title="II. RÉSUMÉ DES OPÉRATIONS" content={R.resume} />}
            {R.bilan && <Section title="III. BILAN" content={R.bilan} />}
            {R.remarques && <Section title="IV. REMARQUES" content={R.remarques} />}
          </>
        )}

        {R.type === 'recommandation' && (
          <>
            <Section title="I. PERSONNE RECOMMANDÉE">
              <strong>{R.recommande_nom}</strong>{R.recommande_grade && <> — {R.recommande_grade}</>}
            </Section>
            {R.raison_1 && <Section title="II. MOTIFS DE LA RECOMMANDATION" content={R.raison_1} />}
            {R.recompense && <Section title="III. RÉCOMPENSE PROPOSÉE" content={R.recompense} />}
          </>
        )}

        {R.type === 'incident' && (
          <>
            <Section title="I. INTRODUCTION">
              <strong>{R.intro_nom}</strong>{R.intro_grade && <> — {R.intro_grade}</>}
              {R.lieu_incident && <><br/>Lieu : <strong>{R.lieu_incident}</strong></>}
            </Section>
            <Section title="II. MISE EN CAUSE">
              <strong>{R.mise_en_cause_nom}</strong>{R.mise_en_cause_grade && <> — {R.mise_en_cause_grade}</>}
            </Section>
            {R.compte_rendu && <Section title="III. COMPTE RENDU DES FAITS" content={R.compte_rendu} />}
          </>
        )}

        {/* Signature + Stamp */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-xl)', borderTop: '2px solid var(--border-color)', marginTop: 'var(--space-xl)', flexWrap: 'wrap', gap: 'var(--space-lg)' }}>
          <div>
            {(R.signature_nom || R.auteur_nom) && (
              <div style={{ fontSize: '0.85rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>Signataire :</div>
                <strong>{R.signature_nom || R.auteur_nom}</strong>
                {(R.signature_grade || R.auteur_grade) && <div>{R.signature_grade || R.auteur_grade}</div>}
              </div>
            )}
            <div style={{ borderBottom: '1px solid var(--text-primary)', width: 200, height: 40, marginTop: 'var(--space-sm)' }}>
              {R.signature_image && <img src={R.signature_image} alt="" style={{ maxHeight: 35, maxWidth: 180 }} />}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Signature</div>
          </div>
          {R.stamp && (
            <div style={{ textAlign: 'center' }}>
              <img src={STAMPS.find(s => s.id === R.stamp)?.url || `/assets/stamps/${R.stamp}.png`} alt="Tampon" style={{ height: 80, opacity: 0.6, transform: 'rotate(-5deg)' }} />
            </div>
          )}
        </div>

        {R.published && (
          <div style={{ textAlign: 'center', marginTop: 'var(--space-md)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            📜 Document publié — Archives 7e Armeekorps
          </div>
        )}
      </div>
      )}

      {/* Validation status */}
      <div className="paper-card" style={{ marginTop: 'var(--space-lg)', borderLeft: `3px solid ${R.valide ? 'var(--success)' : 'var(--warning)'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            {R.valide ? (
              <>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>✅ Validé</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: 12 }}>
                  Lu et approuvé par <strong>{R.valide_par_nom}</strong> — {R.valide_at ? new Date(R.valide_at).toLocaleString('fr-FR') : ''}
                </span>
                {R.valide_signature && R.valide_signature !== 'Auto-validé (Officier)' && (
                  <div style={{ marginTop: 6 }}>
                    <img src={R.valide_signature} alt="Signature validation" style={{ maxHeight: 50, opacity: 0.8 }} />
                  </div>
                )}
              </>
            ) : (
              <>
                <span style={{ color: 'var(--warning)', fontWeight: 700 }}>⏳ En attente de validation</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                  {R.auteur_rang < 35 ? '(Nécessite validation SO ou Officier)' : '(Nécessite validation Officier)'}
                </span>
              </>
            )}
          </div>
          {canValidate && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-primary btn-small" onClick={handleValidateClick}>
                {mySignature ? '✅ Valider & Signer' : '✍️ Dessiner signature & Valider'}
              </button>
              {mySignature && <button className="btn btn-secondary btn-small" onClick={() => setShowValidateSign(true)}>🔄 Redessiner</button>}
            </div>
          )}
        </div>
      </div>

      {/* Signature canvas for validation */}
      {showValidateSign && (
        <div className="popup-overlay" onClick={() => setShowValidateSign(false)}>
          <div className="popup-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <button className="popup-close" onClick={() => setShowValidateSign(false)}>✕</button>
            <h3 style={{ margin: '0 0 16px' }}>✍️ Signer pour valider</h3>
            <SignatureCanvas onSave={(dataUrl) => validateRapport(dataUrl)} width={480} height={200} />
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={() => exportToPdf('rapport-paper', `Rapport_${R.titre?.replace(/\s/g, '_') || R.id}`)}>📄 PDF</button>
        <button className="btn btn-secondary" onClick={() => window.print()}>🖨️ Imprimer</button>
      </div>
    </div>
  )
}

function Section({ title, content, children }) {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--military-dark)', marginBottom: 'var(--space-xs)', paddingBottom: 'var(--space-xs)', borderBottom: '1px solid var(--border-color)' }}>{title}</h3>
      {content ? <p style={{ whiteSpace: 'pre-line', fontSize: '0.85rem', lineHeight: 1.7 }}>{content}</p> : <div style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>{children}</div>}
    </div>
  )
}
