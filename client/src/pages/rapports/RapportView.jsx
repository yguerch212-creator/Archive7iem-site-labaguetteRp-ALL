import BackButton from '../../components/BackButton'
import ShareButton from '../../components/ShareButton'
import LayoutRenderer from '../../components/LayoutRenderer'
import React, { useState, useEffect } from 'react'
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
  const [message, setMessage] = useState(null)
  const [layoutBlocks, setLayoutBlocks] = useState(null)
  const [mySignature, setMySignature] = useState(null)
  const [showValidateSign, setShowValidateSign] = useState(false)

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
      {R.type === 'incident' && !R.affaire_id && R.published && (user?.isFeldgendarmerie || user?.isAdmin) && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: '#fff8e1', borderLeft: '3px solid #ff9800', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <strong>⚠️ Rapport d'incident non traité</strong>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>En tant que Feldgendarmerie, vous pouvez ouvrir une affaire judiciaire.</div>
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
              <div style={{ textAlign: 'center', minWidth: 250 }}>
                <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic', marginBottom: 4 }}>
                  Lu et approuvé le {R.valide_at ? new Date(R.valide_at).toLocaleString('fr-FR') : ''}
                </div>
                <div style={{ borderBottom: '1px solid #333', height: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
                  {R.valide_signature && R.valide_signature !== 'Auto-validé (Officier)' && (
                    <img src={R.valide_signature} alt="Signature" style={{ maxHeight: 45, maxWidth: 220 }} />
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 4 }}>{R.valide_par_nom}</div>
              </div>
            </div>
          </div>
        )}

        {!R.valide && R.published && (
          <div style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-md)', borderTop: '1px dashed #999', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#999', fontStyle: 'italic' }}>⏳ En attente de validation par la chaîne hiérarchique</span>
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
        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={handleValidateClick}>
            {mySignature ? '✅ Valider & Signer' : '✍️ Dessiner signature & Valider'}
          </button>
          {mySignature && <button className="btn btn-secondary" onClick={() => setShowValidateSign(true)}>🔄 Redessiner</button>}
        </div>
      )}

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
