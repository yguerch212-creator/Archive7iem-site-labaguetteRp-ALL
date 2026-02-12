import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import apiClient from '../../api/client'
import Topbar from '../../components/layout/Topbar'

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

  if (loading) return <><Topbar /><div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div></>
  if (!data) return <><Topbar /><div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Effectif introuvable</div></>

  const e = data.effectif
  const unitTitle = `${e.unite_code || ''} ${e.unite_nom || ''}`.trim()

  return (
    <>
      <Topbar />
      <div className="container" style={{ maxWidth: 1000, marginTop: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
          <Link to={`/effectifs/unite/${e.unite_id}`} className="btn btn-secondary btn-small">← Retour liste</Link>
          <Link to={`/effectifs/${id}/soldbuch/edit`} className="btn btn-primary btn-small">🖋️ Modifier mise en page</Link>
        </div>

        <div className="paper-card" id="soldbuch-paper" style={{ minHeight: 1200, position: 'relative', padding: 28 }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 26 }}>📘 SOLDBUCH – LIVRET PERSONNEL DU SOLDAT</h2>
            <div style={{ opacity: 0.85 }}>{unitTitle}</div>
            <div style={{ lineHeight: 1.35, marginTop: 10, fontSize: '0.8rem' }}>
              Dieses Soldbuch ist ein offizielles Dokument der Wehrmacht.<br />
              Ce livret doit rester constamment en possession du soldat.
            </div>
          </div>

          <div style={{ position: 'relative', minHeight: 1000 }}>
            <Section title="1. IDENTITÉ" top={180} left={40} width={420}>
              Nom : {e.nom}<br />Prénom : {e.prenom}<br />
              {e.surnom && <>Surnom : {e.surnom}<br /></>}
              Date de naissance : {e.date_naissance || '—'}<br />
              Lieu de naissance : {e.lieu_naissance || '—'}<br />
              Nationalité : {e.nationalite || '—'}<br />
              {e.taille_cm && <>Taille : {e.taille_cm} cm</>}
            </Section>

            <Section title="2. AFFECTATION" top={430} left={40} width={420}>
              Unité : {unitTitle}<br />Grade : {e.grade_nom || '—'}<br />
              Spécialité : {e.specialite || '—'}<br />
              Entrée RP : {e.date_entree_ig || '—'} — Entrée IRL : {e.date_entree_irl || '—'}
            </Section>

            <Section title="3. ÉQUIPEMENT" top={620} left={40} width={480}>
              Arme principale : {e.arme_principale || '—'}<br />
              Arme secondaire : {e.arme_secondaire || '—'}<br />
              Équipement spécial : {e.equipement_special || '—'}<br />
              Tenue : {e.tenue || '—'}
            </Section>

            <Section title="4. HISTORIQUE" top={800} left={40} width={860}>
              {e.historique || 'Aucun historique renseigné.'}
            </Section>

            <Section title="5. DÉCORATIONS" top={980} left={40} width={420}>
              {e.decorations || 'Aucune décoration.'}
            </Section>

            <Section title="6. SANCTIONS" top={980} left={480} width={420}>
              {e.sanctions || 'Aucune sanction.'}
            </Section>

            {e.photo && (
              <img src={e.photo} alt="Photo" style={{
                position: 'absolute', left: 700, top: 190, width: 170, height: 220,
                border: '2px solid #444', borderRadius: 6, objectFit: 'cover'
              }} />
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>📄 Imprimer / PDF</button>
        </div>
      </div>
    </>
  )
}

function Section({ title, top, left, width, children }) {
  return (
    <div style={{ position: 'absolute', left, top, width, padding: 8 }}>
      <strong>{title}</strong><br />
      <span style={{ fontSize: '0.85rem', whiteSpace: 'pre-line' }}>{children}</span>
    </div>
  )
}
