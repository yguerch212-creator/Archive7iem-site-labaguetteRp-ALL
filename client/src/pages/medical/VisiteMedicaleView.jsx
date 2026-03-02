import ShareButton from '../../components/ShareButton'
import BackButton from '../../components/BackButton'
import SignaturePopup from '../../components/SignaturePopup'
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'

export default function VisiteMedicaleView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSignPopup, setShowSignPopup] = useState(false)

  useEffect(() => {
    api.get(`/medical/${id}`).then(r => { setData(r.data.data); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>
  if (!data) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Visite introuvable</div>

  const v = data
  const fmtDate = d => { if (!d) return '—'; try { const s = String(d).slice(0,10); return new Date(s + 'T00:00').toLocaleDateString('fr-FR') } catch { return '—' } }

  return (
    <div className="container" style={{ maxWidth: 800, paddingBottom: 'var(--space-xxl)' }}>
      <BackButton label="← Retour" />

      <div className="document-paper" id="visite-paper" style={{ marginTop: 'var(--space-lg)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', borderBottom: '2px solid var(--border-color)', paddingBottom: 'var(--space-lg)' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.3rem' }}>🏥 VISITE MÉDICALE</h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {v.effectif_unite_code}. {v.effectif_unite_nom} — Bataillon Sanitaire
          </div>
        </div>

        {/* Certificat */}
        <div style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)' }}>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
            Je soussigné, <strong>{v.medecin || '_______________'}</strong>, certifie avoir examiné ce jour <strong>{v.effectif_grade} {v.effectif_prenom} {v.effectif_nom}</strong>
          </p>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
            {v.aptitude === 'Apte'
              ? 'Ne présentant aucun problème de santé pour entrer dans l\'exercice de ses fonctions.'
              : v.aptitude === 'Apte avec reserves'
              ? 'Apte avec réserves pour l\'exercice de ses fonctions.'
              : `Déclaré ${v.aptitude.toLowerCase()} à l'exercice de ses fonctions.`
            }
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: '0.85rem', marginTop: 'var(--space-sm)' }}>
            <span>Né(e) le : <strong>{fmtDate(v.date_naissance)}</strong></span>
            <span>À : <strong>{v.lieu_naissance || '—'}</strong></span>
          </div>
          <div style={{ fontSize: '0.85rem', marginTop: 'var(--space-sm)' }}>
            Date : <strong>{fmtDate(v.date_visite)}</strong>
          </div>
        </div>

        {/* Fiche Patient */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-xs)', marginBottom: 'var(--space-md)', fontSize: '1rem' }}>📋 Fiche Patient</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px var(--space-lg)', fontSize: '0.85rem' }}>
            <Field label="Nom" value={v.effectif_nom} />
            <Field label="Prénom" value={v.effectif_prenom} />
            <Field label="Date de naissance" value={fmtDate(v.date_naissance)} />
            <Field label="Taille" value={v.taille_cm ? `${v.taille_cm} cm` : '—'} />
            <Field label="Poids" value={v.poids} />
            <Field label="IMC" value={v.imc} />
            <Field label="Groupe sanguin" value={v.groupe_sanguin} />
            <Field label="Profession" value={v.specialite} />
          </div>
          <div style={{ marginTop: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem' }}>
            <Field label="Allergène(s)" value={v.allergenes} />
            <Field label="Antécédents médicaux" value={v.antecedents_medicaux} />
            <Field label="Antécédents psychologiques" value={v.antecedents_psy} />
            <Field label="Consommation de drogue" value={v.conso_drogue} />
            <Field label="Consommation d'alcool" value={v.conso_alcool} />
            <Field label="Consommation de tabac" value={v.conso_tabac} />
          </div>
        </div>

        {/* Tests d'aptitude */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-xs)', marginBottom: 'var(--space-md)', fontSize: '1rem' }}>🏋️ Tests d'aptitude {v.score_aptitude && <span style={{ float: 'right', color: 'var(--military-green)' }}>{v.score_aptitude}/10</span>}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px var(--space-lg)', fontSize: '0.85rem' }}>
            <Field label="Test de vue" value={v.test_vue} />
            <Field label="Test d'ouïe" value={v.test_ouie} />
            <Field label="Test cardio (Squat)" value={v.test_cardio} />
            <Field label="Test de réflexe" value={v.test_reflex} />
            <Field label="Tir réussi / fail" value={v.test_tir} />
          </div>
        </div>

        {/* Diagnostic */}
        {v.diagnostic && (
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-xs)', marginBottom: 'var(--space-md)', fontSize: '1rem' }}>📝 Diagnostic</h3>
            <p style={{ fontSize: '0.85rem', whiteSpace: 'pre-line' }}>{v.diagnostic}</p>
          </div>
        )}

        {/* Restrictions */}
        {v.restrictions && (
          <div style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-sm) var(--space-md)', background: 'rgba(161,124,71,0.08)', border: '1px solid var(--warning)', borderRadius: 'var(--border-radius)' }}>
            <strong>⚠️ Restrictions :</strong> {v.restrictions}
          </div>
        )}

        {/* Commentaire */}
        {v.commentaire && (
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <strong>Commentaire :</strong>
            <p style={{ fontSize: '0.85rem', whiteSpace: 'pre-line' }}>{v.commentaire}</p>
          </div>
        )}

        {/* Aptitude badge */}
        <div style={{ textAlign: 'center', padding: 'var(--space-md)', border: `2px solid ${v.aptitude === 'Apte' ? 'var(--success)' : v.aptitude === 'Inapte definitif' ? 'var(--danger)' : 'var(--warning)'}`, borderRadius: 'var(--border-radius)', marginBottom: 'var(--space-lg)' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            {v.aptitude === 'Apte' ? '🟢' : v.aptitude === 'Inapte definitif' ? '🔴' : '🟡'} {v.aptitude.toUpperCase()}
          </span>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-lg)', borderTop: '2px solid var(--border-color)', fontSize: '0.85rem' }}>
          <div>
            <p style={{ margin: '0 0 4px' }}>Facture : <strong>{v.facture || '100 RM'}</strong></p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Cordialement,<br/>
              {v.medecin || '—'}<br/>
              {v.effectif_unite_code}. Bataillon Sanitaire
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid var(--text-primary)', width: 180, height: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
              {v.signature_medecin && <img src={v.signature_medecin} alt="" style={{ maxHeight: 45, maxWidth: 170 }} />}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Signature du médecin</div>
            {!v.signature_medecin && user && (user.isSanitaets || user.isOfficier || user.isAdmin) && (
              <button className="btn btn-secondary btn-small" style={{ marginTop: 4, fontSize: '0.72rem' }}
                onClick={() => setShowSignPopup(true)}>✍️ Signer</button>
            )}
          </div>
        </div>
      </div>

      {showSignPopup && (
        <SignaturePopup
          onClose={() => setShowSignPopup(false)}
          onSign={async (signatureData) => {
            try {
              await api.put(`/medical/${id}/sign`, { signature_data: signatureData })
              setShowSignPopup(false)
              api.get(`/medical/${id}`).then(r => setData(r.data.data))
            } catch (err) { alert(err.response?.data?.message || 'Erreur') }
          }}
          onRequestSent={() => setShowSignPopup(false)}
          documentType="visite"
          documentId={id}
          documentLabel={`Visite médicale — ${v.effectif_prenom} ${v.effectif_nom}`}
          slotLabel="Signature du médecin"
        />
      )}

      <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
        <button className="btn btn-secondary" onClick={() => window.print()}>🖨️ Imprimer</button>
        <ShareButton />
        {user?.isAdmin && (
          <button className="btn btn-danger" onClick={async () => {
            if (!confirm('Supprimer cette visite médicale ?')) return
            try { await api.delete(`/medical/${id}`); navigate(-1) } catch (err) { alert('Erreur') }
          }}>🗑️ Supprimer</button>
        )}
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 2 }}>
      <span style={{ color: 'var(--text-muted)', minWidth: 180 }}>{label} :</span>
      <span style={{ fontWeight: 500 }}>{value || '—'}</span>
    </div>
  )
}
