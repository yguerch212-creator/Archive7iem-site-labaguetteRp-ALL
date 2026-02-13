import BackButton from '../../components/BackButton'
import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import apiClient from '../../api/client'
import { exportToPdf } from '../../utils/exportPdf'

export default function Soldbuch() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get(`/soldbuch/${id}`).then(r => {
      setData(r.data.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading) return <><div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div></>
  if (!data) return <><div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Effectif introuvable</div></>

  const e = data.effectif
  const unitTitle = `${e.unite_code || ''} ${e.unite_nom || ''}`.trim()

  return (
    <>
      
      <div className="container" style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
          <BackButton className="btn btn-secondary btn-small" label="← Retour" />
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Link to={`/effectifs/${id}/edit`} className="btn btn-secondary btn-small">✏️ Modifier</Link>
            <Link to={`/effectifs/${id}/soldbuch/edit`} className="btn btn-primary btn-small">🖋️ Mise en page</Link>
          </div>
        </div>

        <div className="document-paper" id="soldbuch-paper">
          {/* En-tête */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', borderBottom: '2px solid var(--border-color)', paddingBottom: 'var(--space-lg)' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem' }}>📘 SOLDBUCH</h2>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>LIVRET PERSONNEL DU SOLDAT</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{unitTitle}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
              Dieses Soldbuch ist ein offizielles Dokument der Wehrmacht.
            </div>
          </div>

          {/* Identité + Photo */}
          <div style={{ display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap', marginBottom: 'var(--space-lg)' }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <SectionTitle>1. IDENTITÉ</SectionTitle>
              <Field label="Nom" value={e.nom} />
              <Field label="Prénom" value={e.prenom} />
              {e.surnom && <Field label="Surnom" value={e.surnom} />}
              <Field label="Date de naissance" value={e.date_naissance} />
              <Field label="Lieu de naissance" value={e.lieu_naissance} />
              <Field label="Nationalité" value={e.nationalite} />
              {e.taille_cm && <Field label="Taille" value={`${e.taille_cm} cm`} />}
            </div>
            {e.photo && (
              <div style={{ flexShrink: 0 }}>
                <img src={e.photo} alt="Photo" style={{ width: 150, height: 200, border: '2px solid var(--border-color)', borderRadius: 'var(--border-radius)', objectFit: 'cover' }} />
              </div>
            )}
          </div>

          {/* Affectation */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <SectionTitle>2. AFFECTATION</SectionTitle>
            <div className="grid grid-cols-2" style={{ gap: 'var(--space-sm)' }}>
              <Field label="Unité" value={unitTitle} />
              <Field label="Grade" value={e.grade_nom} />
              <Field label="Spécialité" value={e.specialite} />
              <Field label="Entrée RP" value={e.date_entree_ig} />
              <Field label="Entrée IRL" value={e.date_entree_irl} />
            </div>
          </div>

          {/* Équipement */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <SectionTitle>3. ÉQUIPEMENT</SectionTitle>
            <div className="grid grid-cols-2" style={{ gap: 'var(--space-sm)' }}>
              <Field label="Arme principale" value={e.arme_principale} />
              <Field label="Arme secondaire" value={e.arme_secondaire} />
              <Field label="Équipement spécial" value={e.equipement_special} />
              <Field label="Tenue" value={e.tenue} />
            </div>
          </div>

          {/* Historique */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <SectionTitle>4. HISTORIQUE</SectionTitle>
            <p style={{ whiteSpace: 'pre-line', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {e.historique || 'Aucun historique renseigné.'}
            </p>
          </div>

          {/* Décorations + Sanctions */}
          <div className="grid grid-cols-2" style={{ gap: 'var(--space-lg)' }}>
            <div>
              <SectionTitle>5. DÉCORATIONS</SectionTitle>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{e.decorations || 'Aucune décoration.'}</p>
            </div>
            <div>
              <SectionTitle>6. SANCTIONS</SectionTitle>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{e.sanctions || 'Aucune sanction.'}</p>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-lg)', borderTop: '2px solid var(--border-color)', flexWrap: 'wrap', gap: 'var(--space-lg)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid var(--text-primary)', width: 200, height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
                {e.signature_soldat && <img src={e.signature_soldat} alt="" style={{ maxHeight: 50, maxWidth: 180 }} />}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Signature du soldat</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid var(--text-primary)', width: 200, height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
                {e.signature_referent && <img src={e.signature_referent} alt="" style={{ maxHeight: 50, maxWidth: 180 }} />}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Signature du référent</div>
            </div>
            {e.stamp_path && (
              <div style={{ textAlign: 'center' }}>
                <img src={e.stamp_path} alt="Tampon" style={{ maxHeight: 80, opacity: 0.7 }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', marginBottom: 'var(--space-xl)', display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => exportToPdf('soldbuch-paper', `Soldbuch_${e.prenom}_${e.nom}`)}>📄 Exporter en PDF</button>
          <button className="btn btn-secondary" onClick={() => window.print()}>🖨️ Imprimer</button>
        </div>
      </div>
    </>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--military-dark)', marginBottom: 'var(--space-sm)', paddingBottom: 'var(--space-xs)', borderBottom: '1px solid var(--border-color)' }}>
      {children}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-sm)', fontSize: '0.85rem', marginBottom: 2 }}>
      <span style={{ color: 'var(--text-muted)', minWidth: 130 }}>{label} :</span>
      <span style={{ fontWeight: 500 }}>{value || '—'}</span>
    </div>
  )
}
