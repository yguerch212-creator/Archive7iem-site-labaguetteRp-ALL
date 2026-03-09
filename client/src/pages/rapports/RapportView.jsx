import BackButton from '../../components/BackButton'
import ShareButton from '../../components/ShareButton'
import LayoutRenderer from '../../components/LayoutRenderer'
import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import apiClient from '../../api/client'
import { exportToPdf, exportToImage } from '../../utils/exportPdf'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'
import SignaturePopup from '../../components/SignaturePopup'

const TYPE_LABELS = { rapport: 'Rapport Journalier', recommandation: 'Recommandation', incident: 'Rapport d\'Incident' }
const STAMPS = [
  { id: 'tempon916', label: '916. Grenadier', url: '/assets/stamps/tempon916.png' },
]

export default function RapportView() {
  const { id } = useParams()
  const { user } = useAuth()
  const [rapport, setRapport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [layoutBlocks, setLayoutBlocks] = useState(null)
  const [mySignature, setMySignature] = useState(null)
  const [showValidateSign, setShowValidateSign] = useState(false)
  const [showSignPopup, setShowSignPopup] = useState(false)

  useEffect(() => {
    load()
    if (user?.effectif_id) {
      apiClient.get(`/effectifs/${user.effectif_id}/signature`).then(r => {
        if (r.data?.signature_data) setMySignature(r.data.signature_data)
      }).catch(() => {})
    }
    apiClient.get(`/rapports/${id}/layout`).then(r => {
      if (r.data.blocks && r.data.blocks.length > 0) setLayoutBlocks(r.data.blocks)
    }).catch(() => {})
  }, [id])

  const load = () => {
    apiClient.get(`/rapports/${id}`).then(r => { setRapport(r.data.data); setLoading(false) }).catch(() => setLoading(false))
  }

  // Publier = soumettre pour validation (ou auto-publier si officier)
  const publierRapport = async () => {
    try {
      await apiClient.put(`/rapports/${id}/publish`, {})
      setMessage({ type: 'success', text: '📜 Rapport soumis pour validation' })
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const canValidate = rapport && !rapport.valide && rapport.published && (
    user?.isRecenseur || user?.isAdmin ||
    (rapport.auteur_rang < 35 && (user?.grade_rang >= 35)) ||
    (rapport.auteur_rang >= 35 && rapport.auteur_rang < 60 && (user?.grade_rang >= 60 || user?.isOfficier))
  )

  const [validateStamp, setValidateStamp] = useState(null)
  const [showApprovePopup, setShowApprovePopup] = useState(false)
  const [showApproveSign, setShowApproveSign] = useState(false)
  const [approveComment, setApproveComment] = useState('')
  const [officiers, setOfficiers] = useState([])
  const [selectedOfficier, setSelectedOfficier] = useState(null)
  const [officierSearch, setOfficierSearch] = useState('')

  // Load officiers list for forwarding
  useEffect(() => {
    apiClient.get('/effectifs/all').then(r => {
      const offs = (r.data.data || []).filter(e => (e.grade_rang || 0) >= 60)
      setOfficiers(offs)
    }).catch(() => {})
  }, [])

  const canApprove = rapport && rapport.valide && !rapport.approuve_par && (
    user?.isOfficier || user?.isEtatMajor
  )

  const validateRapport = async (signatureData, forwardToOfficier = false, stampData = null) => {
    try {
      const res = await apiClient.put(`/rapports/${id}/validate`, {
        signature_data: signatureData || mySignature || null,
        stamp_data: stampData || validateStamp?.image_data || null,
        forward_to_officier: forwardToOfficier,
        officier_effectif_id: selectedOfficier?.id || null
      })
      if (signatureData && user?.effectif_id) {
        await apiClient.put(`/effectifs/${user.effectif_id}/signature`, { signature_data: signatureData }).catch(() => {})
        setMySignature(signatureData)
      }
      setShowValidateSign(false)
      setValidateStamp(null)
      const label = res.data?.validatorLabel || ''
      const officierNom = selectedOfficier ? `${selectedOfficier.prenom} ${selectedOfficier.nom}` : ''
      const successMsg = forwardToOfficier
        ? `✅ Rapport validé — envoyé à ${officierNom} pour approbation`
        : `✅ Rapport validé par ${label}`
      setMessage({ type: 'success', text: successMsg })
      setSelectedOfficier(null)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const approveRapport = async (signatureData) => {
    try {
      const res = await apiClient.put(`/rapports/${id}/approve`, {
        signature_data: signatureData || null,
        commentaire: approveComment || null
      })
      if (signatureData && user?.effectif_id) {
        await apiClient.put(`/effectifs/${user.effectif_id}/signature`, { signature_data: signatureData }).catch(() => {})
        setMySignature(signatureData)
      }
      setShowApprovePopup(false)
      setApproveComment('')
      setMessage({ type: 'success', text: `✅ Rapport approuvé par ${res.data?.approverLabel || ''}` })
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const [showForwardChoice, setShowForwardChoice] = useState(false)
  const [pendingForward, setPendingForward] = useState(false)
  const [forwardStep, setForwardStep] = useState('choice') // 'choice' | 'select-officier'

  const handleValidateClick = () => {
    setForwardStep('choice')
    setShowForwardChoice(true)
  }

  const handleValidateWithChoice = (forward) => {
    if (forward) {
      // Show officer selection
      setForwardStep('select-officier')
    } else {
      setShowForwardChoice(false)
      setPendingForward(false)
      setShowValidateSign(true)
    }
  }

  const handleOfficierSelected = () => {
    if (!selectedOfficier) return
    setShowForwardChoice(false)
    setPendingForward(true)
    setShowValidateSign(true)
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
          <Link to={`/rapports/${id}/layout`} className="btn btn-secondary btn-small layout-desktop-only">🖋️ Mise en page</Link>
          {!R.published && (
            <button className="btn btn-primary btn-small" onClick={publierRapport}>
              📜 Soumettre pour validation
            </button>
          )}
        </div>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {/* Incident pris en charge */}
      {R.type === 'incident' && R.affaire_id && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: '#e8f5e9', borderLeft: '3px solid var(--success)' }}>
          <strong>⚖️ Incident pris en charge</strong> par <strong>{R.pris_par_nom}</strong>
          {R.pris_at && <> le {new Date(R.pris_at).toLocaleDateString('fr-FR')}</>}
          {' — '}
          <Link to={`/sanctions/${R.affaire_id}`} style={{ fontWeight: 600, color: 'var(--military-green)' }}>
            Voir l'affaire →
          </Link>
        </div>
      )}

      {/* Prendre en charge (Feldgendarmerie) */}
      {R.type === 'incident' && !R.affaire_id && R.published && (user?.isFeldgendarmerie || user?.isOfficier) && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: '#fff8e1', borderLeft: '3px solid #ff9800', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <strong>⚠️ Rapport d'incident non traité</strong>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>En tant que Feldgendarmerie ou officier, vous pouvez ouvrir une affaire judiciaire.</div>
          </div>
          <button className="btn btn-primary" onClick={async () => {
            if (!confirm('Ouvrir une affaire judiciaire liée à cet incident ?')) return
            try {
              const res = await apiClient.put(`/rapports/${id}/prendre-en-charge`)
              setMessage({ type: 'success', text: `✅ Affaire ${res.data.data.numero} ouverte ! Un télégramme a été envoyé à l'auteur.` })
              load()
            } catch (err) { setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' }) }
          }}>⚖️ Prendre en charge</button>
        </div>
      )}

      {/* Status info */}
      {!R.published && !R.valide && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: '#fdf8e8', borderLeft: '3px solid var(--warning)' }}>
          <strong>📝 Brouillon</strong> — Ce rapport n'a pas encore été soumis pour validation. 
          Cliquez sur « Soumettre pour validation » pour l'envoyer à votre supérieur hiérarchique.
        </div>
      )}
      {R.published && !R.valide && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: '#fdf8e8', borderLeft: '3px solid var(--warning)' }}>
          <strong>⏳ En attente de validation</strong> — 
          {(R.auteur_rang || 0) < 35 ? ' Un sous-officier ou officier doit valider ce rapport.' : ' Un officier doit valider ce rapport.'}
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
            {!R.signature_image && user && (
              <button className="btn btn-secondary btn-small" style={{ marginTop: 4, fontSize: '0.72rem' }}
                onClick={() => setShowSignPopup(true)}>✍️ Signer</button>
            )}
          </div>
          {R.stamp && (
            <div style={{ textAlign: 'center' }}>
              <img src={STAMPS.find(s => s.id === R.stamp)?.url || `/assets/stamps/${R.stamp}.png`} alt="Tampon" style={{ height: 80, opacity: 0.6, transform: 'rotate(-5deg)' }} />
            </div>
          )}
        </div>

        {/* Validation signature — inside the document */}
        {R.valide && R.valide_par_nom && (
          <div style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-md)', borderTop: '1px dashed #999' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ textAlign: 'center', minWidth: 250, position: 'relative' }}>
                <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic', marginBottom: 4 }}>
                  Lu et approuvé le {R.valide_at ? new Date(R.valide_at).toLocaleString('fr-FR') : ''}
                </div>
                <div style={{ position: 'relative', borderBottom: '1px solid #333', height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
                  {R.valide_stamp && (
                    <img src={R.valide_stamp} alt="Tampon" style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%) rotate(-5deg)', maxHeight: 70, maxWidth: 200, opacity: 0.6, zIndex: 0 }} />
                  )}
                  {R.valide_signature && R.valide_signature !== 'Auto-validé (Officier)' && (
                    <img src={R.valide_signature} alt="Signature" style={{ maxHeight: 50, maxWidth: 220, position: 'relative', zIndex: 1 }} />
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 4 }}>{R.valide_par_nom}</div>
              </div>
            </div>
          </div>
        )}

        {/* Officer approval zone */}
        {R.approuve_par_nom && (
          <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '1px dashed #666' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ textAlign: 'center', minWidth: 250, position: 'relative' }}>
                <div style={{ fontSize: '0.75rem', color: '#555', fontStyle: 'italic', marginBottom: 4 }}>
                  Approuvé le {R.approuve_at ? new Date(R.approuve_at).toLocaleString('fr-FR') : ''}
                </div>
                <div style={{ position: 'relative', borderBottom: '1px solid #333', height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
                  {R.approuve_stamp && (
                    <img src={R.approuve_stamp} alt="Tampon" style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%) rotate(-5deg)', maxHeight: 70, maxWidth: 200, opacity: 0.6, zIndex: 0 }} />
                  )}
                  {R.approuve_signature && (
                    <img src={R.approuve_signature} alt="Signature" style={{ maxHeight: 50, maxWidth: 220, position: 'relative', zIndex: 1 }} />
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 4 }}>{R.approuve_par_nom}</div>
              </div>
            </div>
            {R.approuve_commentaire && (
              <div style={{ marginTop: 'var(--space-md)', padding: '10px 14px', background: 'rgba(75,83,32,0.05)', border: '1px solid var(--border-color, #ccc)', borderRadius: 6, fontSize: '0.85rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Commentaire de l'officier :</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{R.approuve_commentaire}</div>
              </div>
            )}
          </div>
        )}

        {R.valide && !R.approuve_par && (
          <div style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#999', fontStyle: 'italic' }}>⏳ En attente d'approbation officier</span>
          </div>
        )}

        {!R.valide && R.published && (
          <div style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-md)', borderTop: '1px dashed #999', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#999', fontStyle: 'italic' }}>⏳ En attente de validation par le bataillon administratif</span>
          </div>
        )}

        {R.published && (
          <div style={{ textAlign: 'center', marginTop: 'var(--space-md)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            📜 Document publié — Archives 7e Armeekorps
          </div>
        )}
      </div>
      )}

      {/* Validate button (outside document) */}
      {canValidate && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleValidateClick}>
            ✅ Valider ce rapport
          </button>
        </div>
      )}

      {/* Validation choice popup */}
      {showForwardChoice && (
        <div className="popup-overlay" onClick={() => setShowForwardChoice(false)}>
          <div className="popup-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <button className="popup-close" onClick={() => setShowForwardChoice(false)}>✕</button>

            {forwardStep === 'choice' && (
              <>
                <h3 style={{ margin: '0 0 12px' }}>📋 Validation du rapport</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  Vous vérifiez la forme du rapport (pas de contenu inapproprié). Souhaitez-vous aussi l'envoyer à un officier pour approbation du fond ?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="btn btn-primary" onClick={() => handleValidateWithChoice(false)} style={{ padding: '12px 20px' }}>
                    ✅ Valider uniquement
                  </button>
                  <button className="btn btn-secondary" onClick={() => handleValidateWithChoice(true)} style={{ padding: '12px 20px' }}>
                    ✅📨 Valider + Envoyer à un officier
                  </button>
                </div>
              </>
            )}

            {forwardStep === 'select-officier' && (
              <>
                <h3 style={{ margin: '0 0 12px' }}>📨 Choisir un officier</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Sélectionnez l'officier qui recevra le rapport pour approbation.
                </p>
                <input
                  className="form-input"
                  placeholder="Rechercher un officier..."
                  value={officierSearch}
                  onChange={e => setOfficierSearch(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--border-color, #ccc)', borderRadius: 6 }}>
                  {officiers.filter(o => {
                    const q = officierSearch.toLowerCase()
                    return !q || `${o.prenom} ${o.nom} ${o.grade_nom || ''}`.toLowerCase().includes(q)
                  }).map(o => (
                    <div key={o.id}
                      onClick={() => setSelectedOfficier(o)}
                      style={{
                        padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                        background: selectedOfficier?.id === o.id ? 'rgba(75,83,32,0.15)' : 'transparent',
                        borderBottom: '1px solid var(--border-color, #eee)'
                      }}>
                      <span><strong>{o.prenom} {o.nom}</strong></span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{o.grade_nom || ''}</span>
                    </div>
                  ))}
                  {officiers.filter(o => {
                    const q = officierSearch.toLowerCase()
                    return !q || `${o.prenom} ${o.nom} ${o.grade_nom || ''}`.toLowerCase().includes(q)
                  }).length === 0 && (
                    <div style={{ padding: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Aucun officier trouvé</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-secondary" onClick={() => setForwardStep('choice')}>← Retour</button>
                  <button className="btn btn-primary" onClick={handleOfficierSelected} disabled={!selectedOfficier}>
                    ✅📨 Valider et envoyer à {selectedOfficier ? `${selectedOfficier.prenom} ${selectedOfficier.nom}` : '...'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Signature popup for validation (with stamp support) */}
      {showValidateSign && (
        <SignaturePopup
          onClose={() => { setShowValidateSign(false); setPendingForward(false) }}
          onSign={(signatureData) => validateRapport(signatureData, pendingForward)}
          documentType="rapport"
          documentId={id}
          documentLabel={`Rapport: ${R.titre}`}
          slotLabel="Signature de validation"
          hideRequest={true}
        />
      )}

      {/* Officer approve button */}
      {canApprove && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => setShowApprovePopup(true)}>
            ⭐ Approuver ce rapport (officier)
          </button>
        </div>
      )}

      {/* Officer approval popup */}
      {showApprovePopup && (
        <div className="popup-overlay" onClick={() => setShowApprovePopup(false)}>
          <div className="popup-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <button className="popup-close" onClick={() => setShowApprovePopup(false)}>✕</button>
            <h3 style={{ margin: '0 0 12px' }}>⭐ Approbation officier</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              Vous approuvez le fond de ce rapport. Votre signature et commentaire seront ajoutés.
            </p>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Commentaire (optionnel)</label>
              <textarea className="form-input" rows={3} value={approveComment} onChange={e => setApproveComment(e.target.value)}
                placeholder="Observations, corrections, remarques sur le contenu..." />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowApprovePopup(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={() => {
                setShowApprovePopup(false)
                setShowApproveSign(true)
              }}>Signer et approuver →</button>
            </div>
          </div>
        </div>
      )}

      {/* Officer approval signature (with stamp) */}
      {showApproveSign && (
        <SignaturePopup
          onClose={() => setShowApproveSign(false)}
          onSign={(signatureData) => approveRapport(signatureData)}
          documentType="rapport"
          documentId={id}
          documentLabel={`Approbation: ${rapport?.titre}`}
          slotLabel="Signature d'approbation officier"
          hideRequest={true}
        />
      )}

      {/* Signature popup for author */}
      {showSignPopup && (
        <SignaturePopup
          onClose={() => setShowSignPopup(false)}
          onSign={async (signatureData) => {
            try {
              await apiClient.put(`/rapports/${id}/sign`, { signature_data: signatureData })
              setShowSignPopup(false)
              load()
            } catch (err) {
              alert(err.response?.data?.message || 'Erreur')
            }
          }}
          onRequestSent={() => setShowSignPopup(false)}
          documentType="rapport"
          documentId={id}
          documentLabel={`Rapport — ${R.titre || R.numero}`}
          slotLabel="Signature de l'auteur"
        />
      )}

      <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={() => exportToPdf('rapport-paper', `Rapport_${R.titre?.replace(/\s/g, '_') || R.id}`)}>📄 PDF</button>
        <button className="btn btn-secondary" onClick={() => exportToImage('rapport-paper', `Rapport_${R.titre?.replace(/\s/g, '_') || R.id}`)}>🖼️ Image</button>
        <button className="btn btn-secondary" onClick={() => window.print()}>🖨️ Imprimer</button>
        <ShareButton />
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
