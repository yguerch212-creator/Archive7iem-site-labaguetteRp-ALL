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
  const [hist, setHist] = useState(null)
  const [showCompteRendu, setShowCompteRendu] = useState(false)

  const canEdit = user?.isAdmin || user?.isOfficier || user?.isRecenseur

  useEffect(() => {
    loadAll()
  }, [effectifId])

  const loadAll = async () => {
    try {
      const [dossierRes, effRes, histRes] = await Promise.all([
        api.get(`/dossiers/effectif/${effectifId}`),
        api.get(`/effectifs/${effectifId}`),
        api.get(`/effectifs/${effectifId}/historique`)
      ])
      setData(dossierRes.data.data)
      setEffectif(effRes.data.data)
      setHist(histRes.data)
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

  // Build unified timeline (including historique, PDS, decorations, affaires)
  const timeline = [
    ...rapports.map(r => ({ type: 'rapport', date: r.created_at, data: r })),
    ...interdits.map(i => ({ type: 'interdit', date: i.created_at, data: i })),
    ...medical.map(m => ({ type: 'medical', date: m.created_at || m.date_visite, data: m })),
    ...entrees.map(e => ({ type: 'note', date: e.created_at, data: e })),
    ...(hist?.historique || []).map(h => ({ type: 'historique', date: h.date_evenement, data: h })),
    ...(hist?.pds || []).map(p => ({ type: 'pds', date: p.created_at, data: p })),
    ...(hist?.decorations || []).map(d => ({ type: 'decoration', date: d.date_attribution || d.created_at, data: d })),
    ...(hist?.affaires || []).map(a => ({ type: 'affaire', date: a.created_at, data: a })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  // Generate compte rendu text
  const genCompteRendu = () => {
    const e = effectif
    let text = `COMPTE RENDU D'ACTIVITÉ\n`
    text += `═══════════════════════════════════════\n\n`
    text += `Effectif : ${e.grade_nom || ''} ${e.prenom} ${e.nom}\n`
    text += `Unité : ${e.unite_code}. ${e.unite_nom}\n`
    text += `Fonction : ${e.fonction || '—'} | Spécialité : ${e.specialite || '—'}\n`
    text += `Statut : ${e.en_reserve ? 'EN RÉSERVE' : 'Actif'}\n\n`

    // Decorations
    if (hist?.decorations?.length) {
      text += `🎖️ DÉCORATIONS (${hist.decorations.length})\n`
      hist.decorations.forEach(d => { text += `  • ${formatDate(d.date_attribution)} — ${d.decoration_nom || d.nom_custom || '?'} ${d.motif ? `(${d.motif})` : ''}\n` })
      text += `\n`
    }

    // PDS
    if (hist?.pds?.length) {
      const totalH = hist.pds.reduce((s, p) => s + (p.total_heures || 0), 0)
      text += `⏱️ PRISE DE SERVICE (${hist.pds.length} semaines, ${totalH}h total)\n`
      hist.pds.slice(0, 10).forEach(p => { text += `  • Semaine ${p.semaine} — ${p.total_heures}h\n` })
      if (hist.pds.length > 10) text += `  ... et ${hist.pds.length - 10} semaines précédentes\n`
      text += `\n`
    }

    // Rapports
    text += `📝 RAPPORTS (${rapports.length})\n`
    rapports.forEach(r => { text += `  • ${formatDate(r.created_at)} — [${r.type}] ${r.titre}\n` })
    text += `\n`

    // Interdits
    if (interdits.length) {
      text += `🚫 INTERDITS DE FRONT (${interdits.length})\n`
      interdits.forEach(i => { text += `  • ${formatDate(i.created_at)} — ${i.type} : ${i.motif} (${i.actif ? 'ACTIF' : 'Levé'})\n` })
      text += `\n`
    }

    // Medical
    if (medical.length) {
      text += `🏥 VISITES MÉDICALES (${medical.length})\n`
      medical.forEach(m => { text += `  • ${formatDate(m.date_visite || m.created_at)} — ${m.aptitude || '?'} ${m.diagnostic ? `: ${m.diagnostic}` : ''}\n` })
      text += `\n`
    }

    // Affaires
    if (hist?.affaires?.length) {
      text += `⚖️ AFFAIRES JUDICIAIRES (${hist.affaires.length})\n`
      hist.affaires.forEach(a => { text += `  • ${a.numero} — ${a.titre} (${a.role || '?'}, ${a.statut})\n` })
      text += `\n`
    }

    // Historique events
    if (hist?.historique?.length) {
      text += `📜 HISTORIQUE\n`
      hist.historique.forEach(h => { text += `  • ${formatDate(h.date_evenement)} — [${h.type}] ${h.description}\n` })
      text += `\n`
    }

    text += `═══════════════════════════════════════\n`
    text += `Généré le ${new Date().toLocaleDateString('fr-FR')} — Archives du 7. Armeekorps`
    return text
  }

  const formatDate = (d) => {
    if (!d) return '—'
    const date = new Date(d)
    if (isNaN(date)) return d
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

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
              <span className="dossier-stat">🎖️ {hist?.decorations?.length || 0} décoration{(hist?.decorations?.length || 0) !== 1 ? 's' : ''}</span>
              <span className="dossier-stat">⏱️ {hist?.pds?.length || 0} sem. PDS</span>
              {effectif.en_reserve ? <span className="dossier-stat" style={{ color: '#8a7d6b', fontWeight: 700 }}>🏕️ RÉSERVE</span> : null}
            </div>
          </div>
        </div>
        <div className="dossier-header-actions">
          <Link to={`/effectifs/${effectifId}/soldbuch`} className="btn btn-sm">📖 Soldbuch</Link>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowCompteRendu(true)}>📄 Compte rendu</button>
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
        <button className={`pds-tab ${tab === 'pds' ? 'active' : ''}`} onClick={() => setTab('pds')}>⏱️ PDS ({hist?.pds?.length || 0})</button>
        <button className={`pds-tab ${tab === 'decorations' ? 'active' : ''}`} onClick={() => setTab('decorations')}>🎖️ Décorations ({hist?.decorations?.length || 0})</button>
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
                      {item.type === 'historique' && `📜 ${item.data.type === 'creation' ? 'Création' : item.data.type === 'reserve' ? 'Réserve' : item.data.type === 'reintegration' ? 'Réintégration' : item.data.type === 'decoration' ? 'Décoration' : item.data.type === 'grade' ? 'Changement de grade' : item.data.type}`}
                      {item.type === 'pds' && `⏱️ PDS — Semaine ${item.data.semaine}`}
                      {item.type === 'decoration' && `🎖️ Décoration`}
                      {item.type === 'affaire' && `⚖️ Affaire ${item.data.numero}`}
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
                    {item.type === 'historique' && <p>{item.data.description}</p>}
                    {item.type === 'pds' && <p><strong>{item.data.total_heures}h</strong> {(item.data.total_heures || 0) >= 6 ? '✅' : '❌ < 6h minimum'}</p>}
                    {item.type === 'decoration' && <p><strong>{item.data.decoration_nom || item.data.nom_custom}</strong>{item.data.motif ? ` — ${item.data.motif}` : ''}</p>}
                    {item.type === 'affaire' && <p><Link to={`/sanctions/${item.data.id}`}>{item.data.titre}</Link> — Rôle: {item.data.role || '?'} ({item.data.statut})</p>}
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
                  <p className="text-muted">Du {formatDate(i.date_debut)}{i.date_fin ? ` au ${formatDate(i.date_fin)}` : ''} · Par {i.ordonne_par_nom}</p>
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
      {/* PDS tab */}
      {tab === 'pds' && (
        <div className="dossier-list">
          {!hist?.pds?.length ? <p className="text-muted">Aucune donnée PDS</p> : (
            <div className="card" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Semaine</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Heures</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Statut</th>
                </tr></thead>
                <tbody>
                  {hist.pds.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 12px' }}>{p.semaine}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: (p.total_heures || 0) >= 6 ? 'var(--success)' : 'var(--danger)' }}>{p.total_heures || 0}h</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{(p.total_heures || 0) >= 6 ? '✅' : '❌ < 6h'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Decorations tab */}
      {tab === 'decorations' && (
        <div className="dossier-list">
          {!hist?.decorations?.length ? <p className="text-muted">Aucune décoration</p> : (
            hist.decorations.map((d, i) => (
              <div key={i} className="card dossier-list-item">
                <div>
                  <span>🎖️ <strong>{d.decoration_nom || d.nom_custom || '—'}</strong></span>
                  {d.motif && <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>{d.motif}</p>}
                  <p className="text-muted">{formatDate(d.date_attribution)} — Par {d.attribue_par || '—'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Compte rendu popup */}
      {showCompteRendu && (
        <div className="popup-overlay" onClick={() => setShowCompteRendu(false)}>
          <div className="popup-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, maxHeight: '85vh', overflow: 'auto' }}>
            <button className="popup-close" onClick={() => setShowCompteRendu(false)}>✕</button>
            <h2 style={{ marginTop: 0, textAlign: 'center' }}>📄 Compte rendu d'activité</h2>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem', lineHeight: 1.6, background: '#f5f2e8', border: '1px solid #c4b99a', borderRadius: 4, padding: '30px 40px' }}>{genCompteRendu()}</pre>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={() => {
                const blob = new Blob([genCompteRendu()], { type: 'text/plain;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = `CompteRendu_${effectif.prenom}_${effectif.nom}.txt`; a.click()
              }}>📥 Télécharger (.txt)</button>
              <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(genCompteRendu()); }}>📋 Copier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
