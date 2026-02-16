import BackButton from '../../components/BackButton'
import ShareButton from '../../components/ShareButton'
import LayoutRenderer from '../../components/LayoutRenderer'
import SignaturePopup from '../../components/SignaturePopup'
import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import apiClient from '../../api/client'
import { exportToPdf } from '../../utils/exportPdf'
import { formatDateSoft } from '../../utils/dates'

export default function Soldbuch() {
  const { id } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [decorations, setDecorations] = useState([])
  const [allDecorations, setAllDecorations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDecoForm, setShowDecoForm] = useState(false)
  const [decoForm, setDecoForm] = useState({ decoration_id: '', nom_custom: '', date_attribution: '', attribue_par: '', motif: '' })
  const [decoMsg, setDecoMsg] = useState(null)

  const [signPopup, setSignPopup] = useState(null) // null | { slot: 'soldat'|'referent' }

  const isSelf = user?.effectif_id && String(user.effectif_id) === String(id)
  const canManageDecos = user?.isAdmin || user?.isRecenseur || isSelf
  const canSignSoldat = isSelf || user?.isAdmin
  const canSignReferent = user?.isOfficier || user?.isAdmin || user?.isRecenseur

  const loadDecos = () => apiClient.get(`/decorations/effectif/${id}`).then(r => setDecorations(r.data.data || []))

  useEffect(() => {
    Promise.all([
      apiClient.get(`/soldbuch/${id}`),
      apiClient.get(`/decorations/effectif/${id}`),
      apiClient.get('/decorations')
    ]).then(([soldbuchRes, decoRes, allDecoRes]) => {
      setData(soldbuchRes.data.data)
      setDecorations(decoRes.data.data || [])
      setAllDecorations(allDecoRes.data.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const submitDeco = async (ev) => {
    ev.preventDefault()
    try {
      await apiClient.post(`/decorations/effectif/${id}`, decoForm)
      setDecoForm({ decoration_id: '', nom_custom: '', date_attribution: '', attribue_par: '', motif: '' })
      setShowDecoForm(false)
      setDecoMsg({ type: 'success', text: 'Décoration attribuée ✓' })
      setTimeout(() => setDecoMsg(null), 2000)
      loadDecos()
    } catch (err) {
      setDecoMsg({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const removeDeco = async (decoId) => {
    if (!confirm('Retirer cette décoration ?')) return
    try {
      await apiClient.delete(`/decorations/effectif-decoration/${decoId}`)
      loadDecos()
    } catch (err) { console.error(err) }
  }

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>
  if (!data) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Effectif introuvable</div>

  const e = data.effectif
  const layoutBlocks = data.layout?.blocks
  const unitTitle = `${e.unite_code || ''} ${e.unite_nom || ''}`.trim()

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
        <BackButton className="btn btn-secondary btn-small" label="← Retour" />
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <Link to={`/effectifs/${id}/edit`} className="btn btn-secondary btn-small">✏️ Modifier</Link>
          <Link to={`/dossiers/effectif/${id}`} className="btn btn-secondary btn-small">📁 Dossier</Link>
          <Link to={`/effectifs/${id}/soldbuch/edit`} className="btn btn-primary btn-small layout-desktop-only">🖋️ Mise en page</Link>
        </div>
      </div>

      {layoutBlocks && layoutBlocks.length > 0 ? (
        <div className="document-paper" id="soldbuch-paper">
          <LayoutRenderer blocks={layoutBlocks} />
        </div>
      ) : (
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
            <Field label="Date de naissance" value={formatDateSoft(e.date_naissance)} />
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
            <Field label="Entrée RP" value={formatDateSoft(e.date_entree_ig)} />
            <Field label="Entrée IRL" value={formatDateSoft(e.date_entree_irl)} />
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
            {decorations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {decorations.map(d => (
                  <div key={d.id} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div>
                      <span>🎖️ {d.decoration_nom || d.nom_custom}</span>
                      {d.nom_allemand && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', marginLeft: 6 }}>({d.nom_allemand})</span>}
                      {d.motif && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 20 }}>"{d.motif}"</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {d.date_attribution && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{d.date_attribution}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{e.decorations || 'Aucune décoration.'}</p>
            )}
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
            {(canSignSoldat || canSignReferent) && !e.signature_soldat && (
              <button className="btn btn-secondary btn-small" style={{ marginTop: 4, fontSize: '0.75rem' }}
                onClick={() => setSignPopup({ slot: 'soldat' })}>
                ✍️ Signer
              </button>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid var(--text-primary)', width: 200, height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
              {e.signature_referent && <img src={e.signature_referent} alt="" style={{ maxHeight: 50, maxWidth: 180 }} />}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Signature du référent</div>
            {(canSignSoldat || canSignReferent) && !e.signature_referent && (
              <button className="btn btn-secondary btn-small" style={{ marginTop: 4, fontSize: '0.75rem' }}
                onClick={() => setSignPopup({ slot: 'referent' })}>
                ✍️ Signer
              </button>
            )}
          </div>
          {e.stamp_path && (
            <div style={{ textAlign: 'center' }}>
              <img src={e.stamp_path} alt="Tampon" style={{ maxHeight: 80, opacity: 0.7 }} />
            </div>
          )}
        </div>
      </div>
      )}

      {/* Decoration management (outside paper — not in PDF) */}
      {canManageDecos && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          {decoMsg && <div className={`alert alert-${decoMsg.type}`}>{decoMsg.text}</div>}
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
            <button className="btn btn-secondary btn-small" onClick={() => setShowDecoForm(!showDecoForm)}>
              {showDecoForm ? '✕ Fermer' : '🎖️ Attribuer une décoration'}
            </button>
            {decorations.length > 0 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{decorations.length} décoration{decorations.length > 1 ? 's' : ''}</span>
            )}
          </div>
          {/* Manage existing decorations */}
          {!showDecoForm && decorations.length > 0 && (user?.isAdmin || user?.isRecenseur) && (
            <div className="card" style={{ padding: 'var(--space-sm)' }}>
              {decorations.map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.85rem' }}>🎖️ {d.decoration_nom || d.nom_custom} {d.date_attribution ? `— ${d.date_attribution}` : ''}</span>
                  <button onClick={() => removeDeco(d.id)} className="btn btn-danger-sm btn-small" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>✕ Retirer</button>
                </div>
              ))}
            </div>
          )}
          {showDecoForm && (
            <div className="card" style={{ padding: 'var(--space-md)' }}>
              <form onSubmit={submitDeco}>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Décoration</label>
                    <select className="form-input" value={decoForm.decoration_id} onChange={ev => setDecoForm(p => ({...p, decoration_id: ev.target.value, nom_custom: ''}))}>
                      <option value="">— Personnalisée —</option>
                      {Object.entries(
                        allDecorations.reduce((acc, d) => { (acc[d.categorie] = acc[d.categorie] || []).push(d); return acc }, {})
                      ).map(([cat, items]) => (
                        <optgroup key={cat} label={cat}>
                          {items.map(d => <option key={d.id} value={d.id}>{d.nom} {d.nom_allemand ? `(${d.nom_allemand})` : ''}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  {!decoForm.decoration_id && (
                    <div className="form-group" style={{ flex: 2 }}>
                      <label className="form-label">Nom personnalisé *</label>
                      <input type="text" className="form-input" value={decoForm.nom_custom} onChange={ev => setDecoForm(p => ({...p, nom_custom: ev.target.value}))} placeholder="Nom de la décoration..." required={!decoForm.decoration_id} />
                    </div>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date d'attribution</label>
                    <input type="text" className="form-input" value={decoForm.date_attribution} onChange={ev => setDecoForm(p => ({...p, date_attribution: ev.target.value}))} placeholder="Ex: Mars 1944" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Attribué par</label>
                    <input type="text" className="form-input" value={decoForm.attribue_par} onChange={ev => setDecoForm(p => ({...p, attribue_par: ev.target.value}))} placeholder="Nom de l'officier..." />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Motif</label>
                  <input type="text" className="form-input" value={decoForm.motif} onChange={ev => setDecoForm(p => ({...p, motif: ev.target.value}))} placeholder="Raison de l'attribution..." />
                </div>
                <button type="submit" className="btn btn-primary btn-small">🎖️ Attribuer</button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Signature Popup */}
      {signPopup && (
        <SignaturePopup
          onClose={() => setSignPopup(null)}
          onSign={async (signatureData) => {
            try {
              await apiClient.put(`/soldbuch/${id}/sign`, { slot: signPopup.slot, signature_data: signatureData })
              setSignPopup(null)
              // Reload data
              const res = await apiClient.get(`/soldbuch/${id}`)
              setData(res.data.data)
            } catch (err) {
              alert(err.response?.data?.message || 'Erreur lors de la signature')
            }
          }}
          onRequestSent={() => setSignPopup(null)}
          documentType="soldbuch"
          documentId={id}
          documentLabel={`Soldbuch de ${e.prenom} ${e.nom}`}
          slotLabel={signPopup.slot === 'soldat' ? 'Signature du soldat' : 'Signature du référent'}
          hideSelf={signPopup.slot === 'soldat' ? !canSignSoldat : !canSignReferent}
        />
      )}

      <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', marginBottom: 'var(--space-xl)', display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={() => exportToPdf('soldbuch-paper', `Soldbuch_${e.prenom}_${e.nom}`)}>📄 Exporter en PDF</button>
        <button className="btn btn-secondary" onClick={() => window.print()}>🖨️ Imprimer</button>
        <ShareButton />
      </div>
    </div>
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
