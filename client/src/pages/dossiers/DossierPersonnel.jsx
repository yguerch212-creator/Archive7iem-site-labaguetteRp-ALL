import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import './dossiers.css'

const RAPPORT_ICONS = { rapport: '📋', recommandation: '⭐', incident: '🚨' }

export default function DossierPersonnel() {
  const { effectifId } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [effectif, setEffectif] = useState(null)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteForm, setNoteForm] = useState({ titre: '', contenu: '', date_rp: '' })
  const [message, setMessage] = useState(null)
  const [tab, setTab] = useState('timeline')

  const canEdit = user?.isAdmin || user?.isOfficier || user?.isRecenseur

  useEffect(() => {
    loadAll()
  }, [effectifId])

  const loadAll = async () => {
    try {
      const [dossierRes, effRes] = await Promise.all([
        api.get(`/dossiers/effectif/${effectifId}`),
        api.get(`/effectifs/${effectifId}`)
      ])
      setData(dossierRes.data.data)
      setEffectif(effRes.data.data)
    } catch (err) { console.error(err) }
  }

  const addNote = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/dossiers/${data.dossier.id}/entrees`, { type: 'note', ...noteForm })
      setShowNoteForm(false)
      setNoteForm({ titre: '', contenu: '', date_rp: '' })
      setMessage({ type: 'success', text: 'Note ajoutée' })
      setTimeout(() => setMessage(null), 2000)
      loadAll()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const deleteEntry = async (id) => {
    if (!confirm('Supprimer cette entrée ?')) return
    try {
      await api.delete(`/dossiers/entrees/${id}`)
      loadAll()
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur' })
    }
  }

  if (!data || !effectif) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>

  const { dossier, rapports, interdits, medical, entrees } = data

  // Build unified timeline
  const timeline = [
    ...rapports.map(r => ({ type: 'rapport', date: r.created_at, data: r })),
    ...interdits.map(i => ({ type: 'interdit', date: i.created_at, data: i })),
    ...medical.map(m => ({ type: 'medical', date: m.created_at || m.date_visite, data: m })),
    ...entrees.map(e => ({ type: 'note', date: e.created_at, data: e }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="dossier-detail-page">
      <BackButton label="← Retour" />

      {/* Header card */}
      <div className="dossier-header-card card">
        <div className="dossier-header-info">
          {effectif.photo && <img src={effectif.photo} alt="Photo" className="dossier-photo" />}
          <div>
            <h1>{effectif.grade_nom && `${effectif.grade_nom} `}{effectif.prenom} {effectif.nom}</h1>
            <p className="dossier-subtitle">
              {effectif.unite_code}. {effectif.unite_nom}
              {effectif.specialite && ` — ${effectif.specialite}`}
              {effectif.fonction && ` — ${effectif.fonction}`}
            </p>
            <div className="dossier-stats">
              <span className="dossier-stat">📋 {rapports.length} rapport{rapports.length !== 1 ? 's' : ''}</span>
              <span className="dossier-stat">🚫 {interdits.length} interdit{interdits.length !== 1 ? 's' : ''}</span>
              <span className="dossier-stat">🏥 {medical.length} visite{medical.length !== 1 ? 's' : ''}</span>
              <span className="dossier-stat">📝 {entrees.length} note{entrees.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        <div className="dossier-header-actions">
          <Link to={`/effectifs/${effectifId}/soldbuch`} className="btn btn-sm">📖 Soldbuch</Link>
          {canEdit && (
            <button className="btn btn-sm btn-primary" onClick={() => setShowNoteForm(!showNoteForm)}>
              {showNoteForm ? '✕' : '+ Ajouter une note'}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="alert-close">✕</button>
        </div>
      )}

      {/* Note form */}
      {showNoteForm && (
        <div className="card dossier-form">
          <h3>📝 Ajouter une note au dossier</h3>
          <form onSubmit={addNote}>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Titre</label>
                <input type="text" className="form-input" value={noteForm.titre} onChange={e => setNoteForm(p => ({...p, titre: e.target.value}))} placeholder="Objet de la note..." />
              </div>
              <div className="form-group">
                <label className="form-label">Date RP</label>
                <input type="text" className="form-input" value={noteForm.date_rp} onChange={e => setNoteForm(p => ({...p, date_rp: e.target.value}))} placeholder="xx/xx/1944" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Contenu *</label>
              <textarea className="form-input form-textarea" value={noteForm.contenu} onChange={e => setNoteForm(p => ({...p, contenu: e.target.value}))} required rows={4} placeholder="Observations, remarques, faits notables..." />
            </div>
            <button type="submit" className="btn btn-primary">📝 Ajouter</button>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="pds-tabs" style={{ marginBottom: '1.5rem' }}>
        <button className={`pds-tab ${tab === 'timeline' ? 'active' : ''}`} onClick={() => setTab('timeline')}>📜 Chronologie</button>
        <button className={`pds-tab ${tab === 'rapports' ? 'active' : ''}`} onClick={() => setTab('rapports')}>📋 Rapports ({rapports.length})</button>
        <button className={`pds-tab ${tab === 'interdits' ? 'active' : ''}`} onClick={() => setTab('interdits')}>🚫 Interdits ({interdits.length})</button>
        <button className={`pds-tab ${tab === 'medical' ? 'active' : ''}`} onClick={() => setTab('medical')}>🏥 Médical ({medical.length})</button>
      </div>

      {/* Timeline view */}
      {tab === 'timeline' && (
        <div className="dossier-timeline">
          {timeline.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Dossier vierge — aucun événement enregistré</p>
            </div>
          ) : (
            timeline.map((item, i) => (
              <div key={`${item.type}-${item.data.id}-${i}`} className={`timeline-item timeline-${item.type}`}>
                <div className="timeline-dot" />
                <div className="timeline-content card">
                  <div className="timeline-header">
                    <span className="timeline-type">
                      {item.type === 'rapport' && `${RAPPORT_ICONS[item.data.type] || '📋'} ${item.data.type === 'rapport' ? 'Rapport' : item.data.type === 'recommandation' ? 'Recommandation' : 'Incident'}`}
                      {item.type === 'interdit' && `🚫 Interdit de front — ${item.data.type}`}
                      {item.type === 'medical' && `🏥 Visite médicale — ${item.data.aptitude || ''}`}
                      {item.type === 'note' && `📝 Note`}
                    </span>
                    <span className="timeline-date">{formatDate(item.date)}</span>
                  </div>
                  <div className="timeline-body">
                    {item.type === 'rapport' && (
                      <Link to={`/rapports/${item.data.id}`} className="timeline-link">{item.data.titre}</Link>
                    )}
                    {item.type === 'interdit' && (
                      <>
                        <p><strong>{item.data.actif ? '🔴 Actif' : '✅ Levé'}</strong> — {item.data.motif}</p>
                        <p className="text-muted">Ordonné par {item.data.ordonne_par_nom}</p>
                      </>
                    )}
                    {item.type === 'medical' && (
                      <>
                        <p><strong>{item.data.aptitude}</strong></p>
                        {item.data.diagnostic && <p>{item.data.diagnostic}</p>}
                        {item.data.restrictions && <p className="text-muted">Restrictions : {item.data.restrictions}</p>}
                      </>
                    )}
                    {item.type === 'note' && (
                      <>
                        {item.data.titre && <p><strong>{item.data.titre}</strong></p>}
                        <p>{item.data.contenu}</p>
                        <p className="text-muted">Par {item.data.created_by_nom}{item.data.date_rp ? ` — RP: ${item.data.date_rp}` : ''}</p>
                        {(user?.isAdmin || user?.id === item.data.created_by) && (
                          <button className="btn btn-sm btn-ghost" onClick={() => deleteEntry(item.data.id)}>🗑️</button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Rapports tab */}
      {tab === 'rapports' && (
        <div className="dossier-list">
          {rapports.length === 0 ? <p className="text-muted">Aucun rapport associé</p> : (
            rapports.map(r => (
              <Link key={r.id} to={`/rapports/${r.id}`} className="card dossier-list-item">
                <span>{RAPPORT_ICONS[r.type] || '📋'} {r.titre}</span>
                <span className="text-muted">{formatDate(r.created_at)}</span>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Interdits tab */}
      {tab === 'interdits' && (
        <div className="dossier-list">
          {interdits.length === 0 ? <p className="text-muted">Aucun interdit de front</p> : (
            interdits.map(i => (
              <div key={i.id} className="card dossier-list-item">
                <div>
                  <span>{i.actif ? '🔴' : '✅'} {i.type} — {i.motif}</span>
                  <p className="text-muted">Du {i.date_debut}{i.date_fin ? ` au ${i.date_fin}` : ''} · Par {i.ordonne_par_nom}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Medical tab */}
      {tab === 'medical' && (
        <div className="dossier-list">
          {medical.length === 0 ? <p className="text-muted">Aucune visite médicale</p> : (
            medical.map(m => (
              <div key={m.id} className="card dossier-list-item">
                <div>
                  <span>{m.aptitude === 'Apte' ? '🟢' : m.aptitude === 'Inapte temporaire' ? '🟡' : m.aptitude === 'Inapte definitif' ? '🔴' : '🟠'} {m.aptitude}</span>
                  {m.diagnostic && <p>{m.diagnostic}</p>}
                  <p className="text-muted">{formatDate(m.date_visite)}{m.restrictions ? ` · Restrictions: ${m.restrictions}` : ''}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
