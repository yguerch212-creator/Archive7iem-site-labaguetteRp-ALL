import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import apiClient from '../../api/client'

const TYPE_LABELS = { rapport: 'Rapport Journalier', recommandation: 'Recommandation', incident: 'Rapport d\'Incident' }

export default function RapportView() {
  const { id } = useParams()
  const [rapport, setRapport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get(`/rapports/${id}`).then(r => { setRapport(r.data.data); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  if (loading) return <><div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div></>
  if (!rapport) return <><div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Rapport introuvable</div></>

  const R = rapport
  const media = R.fichier_media ? (typeof R.fichier_media === 'string' ? JSON.parse(R.fichier_media) : R.fichier_media) : []

  return (
    <>
      
      <div className="container" style={{ maxWidth: 980 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
          <Link to="/rapports" className="btn btn-secondary btn-small">← Retour liste</Link>
          {!R.published && <Link to={`/rapports/${id}/layout`} className="btn btn-primary btn-small">🖋️ Mise en page</Link>}
        </div>

        <div className="document-paper" id="rapport-paper" style={{ minHeight: 600 }}>
          {/* Si publié avec contenu_html, afficher tel quel */}
          {R.published && R.contenu_html ? (
            <div dangerouslySetInnerHTML={{ __html: R.contenu_html }} />
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <h2 style={{ margin: '0 0 6px' }}>📜 {TYPE_LABELS[R.type] || 'RAPPORT'} : {R.titre}</h2>
                <div style={{ opacity: 0.85 }}>
                  Rédigé par {R.auteur_nom || 'Inconnu'}
                  {R.personne_renseignee_nom && <> — Personne renseignée : {R.personne_renseignee_nom}</>}<br />
                  Date RP : {R.date_rp || '—'} — Date IRL : {R.date_irl || '—'}
                </div>
              </div>

              {/* Rapport journalier */}
              {R.type === 'rapport' && (
                <>
                  {R.contexte && <Block title="I. CONTEXTE">{R.contexte}</Block>}
                  {R.resume && <Block title="II. RÉSUMÉ">{R.resume}</Block>}
                  {R.bilan && <Block title="III. BILAN">{R.bilan}</Block>}
                  {R.remarques && <Block title="IV. REMARQUES">{R.remarques}</Block>}
                </>
              )}

              {/* Recommandation */}
              {R.type === 'recommandation' && (
                <>
                  <Block title="I. PERSONNE RECOMMANDÉE">{R.recommande_nom} — {R.recommande_grade}</Block>
                  {R.raison_1 && <Block title="II. MOTIFS">{R.raison_1}</Block>}
                  {R.recompense && <Block title="III. RÉCOMPENSE PROPOSÉE">{R.recompense}</Block>}
                </>
              )}

              {/* Incident */}
              {R.type === 'incident' && (
                <>
                  <Block title="I. INTRODUCTION">{R.intro_nom} — {R.intro_grade}<br />Lieu : {R.lieu_incident}</Block>
                  <Block title="II. MISE EN CAUSE">{R.mise_en_cause_nom} — {R.mise_en_cause_grade}</Block>
                  {R.compte_rendu && <Block title="III. COMPTE RENDU">{R.compte_rendu}</Block>}
                </>
              )}

              {/* Médias */}
              {media.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong>Médias</strong><br />
                  {media.map((m, i) => (
                    <div key={i} style={{ marginTop: 8 }}>
                      {/\.(mp4|webm)$/i.test(m.url) ? (
                        <video controls src={m.url} style={{ maxWidth: '100%', borderRadius: 8 }} />
                      ) : (
                        <img src={m.url} alt="" style={{ maxWidth: '100%', borderRadius: 8 }} />
                      )}
                      {m.legend && <div style={{ opacity: 0.8, fontStyle: 'italic', marginTop: 4 }}>{m.legend}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Signature */}
              {(R.signature_nom || R.signature_image) && (
                <div style={{ textAlign: 'right', marginTop: 20 }}>
                  {R.signature_nom}{R.signature_grade && ` — ${R.signature_grade}`}<br />
                  {R.signature_image && <img src={R.signature_image} alt="Signature" style={{ maxHeight: 100 }} />}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>📄 Imprimer / PDF</button>
        </div>
      </div>
    </>
  )
}

function Block({ title, children }) {
  return (
    <div style={{ marginTop: 12 }}>
      <strong>{title}</strong><br />
      <span style={{ whiteSpace: 'pre-line' }}>{children}</span>
    </div>
  )
}
