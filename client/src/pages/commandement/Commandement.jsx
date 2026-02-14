import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'

export default function Commandement() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [notePrivate, setNotePrivate] = useState(false)
  const [msg, setMsg] = useState('')
  const [etat, setEtat] = useState(null)
  const [showEtat, setShowEtat] = useState(false)
  const [etatFilter, setEtatFilter] = useState('')

  useEffect(() => {
    api.get('/commandement/dashboard').then(r => setData(r.data)).catch(() => {})
    loadNotes()
  }, [])

  const loadNotes = () => api.get('/commandement/notes').then(r => setNotes(r.data.data)).catch(() => {})

  const addNote = async () => {
    if (!newNote.trim()) return
    try {
      await api.post('/commandement/notes', { contenu: newNote, prive: notePrivate })
      setNewNote(''); setNotePrivate(false); loadNotes()
    } catch (err) { setMsg('Erreur') }
  }

  const removeNote = async (id) => {
    try { await api.delete(`/commandement/notes/${id}`); loadNotes() } catch {}
  }

  if (!data) return <div className="container"><p style={{ textAlign: 'center', padding: 40 }}>Chargement...</p></div>

  const pdsPercent = data.pds.total > 0 ? Math.round((data.pds.valides / data.pds.total) * 100) : 0

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton label="← Tableau de bord" />
      </div>
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>🎖️ Poste de Commandement</h1>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {[
          { icon: '👥', label: 'Effectifs actifs', value: data.parStatut.actifs, color: '#3d5a3e' },
          { icon: '🚫', label: 'Interdits de front', value: data.parStatut.interdits, color: '#8b4a47' },
          { icon: '📝', label: 'Rapports (semaine)', value: data.rapportsSemaine, color: '#2c5f7c' },
          { icon: '⏳', label: 'Rapports à valider', value: data.rapportsNonValides, color: '#8b6914' },
          { icon: '⏱️', label: `PDS compliance`, value: `${pdsPercent}%`, color: pdsPercent >= 70 ? '#3d5a3e' : '#8b4a47' },
        ].map((s, i) => (
          <div key={i} className="paper-card" style={{ textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '2rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
        {/* Recent activity */}
        <div className="paper-card">
          <h3 style={{ marginTop: 0 }}>📋 Activité récente</h3>
          {data.activiteRecente?.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucune activité</p> : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {data.activiteRecente.map((a, i) => (
                <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                  <span style={{ marginRight: 8 }}>{a.type === 'rapport' ? '📝' : '⚡'}</span>
                  <strong>{a.label}</strong>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.auteur} — {new Date(a.created_at).toLocaleString('fr-FR')}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            {data.rapportsNonValides > 0 && <Link to="/rapports" className="btn btn-sm btn-primary">📝 {data.rapportsNonValides} rapport(s) à valider</Link>}
          </div>
        </div>

        {/* Notes officiers */}
        <div className="paper-card">
          <h3 style={{ marginTop: 0 }}>📌 Notes de commandement</h3>
          <div style={{ marginBottom: 12 }}>
            <textarea className="form-input" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Écrire une note..." rows={2} style={{ resize: 'vertical', width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <label style={{ fontSize: '0.78rem', display: 'flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={notePrivate} onChange={e => setNotePrivate(e.target.checked)} /> Privée
              </label>
              <button className="btn btn-sm btn-primary" onClick={addNote}>📌 Ajouter</button>
            </div>
          </div>
          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
            {notes.map(n => (
              <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem', position: 'relative' }}>
                {n.prive ? <span style={{ fontSize: '0.65rem', color: 'var(--warning)' }}>🔒 </span> : null}
                <span>{n.contenu}</span>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{n.auteur_nom} — {new Date(n.created_at).toLocaleString('fr-FR')}</div>
                {(user?.isAdmin || n.auteur_id === user?.id) && (
                  <button onClick={() => removeNote(n.id)} style={{ position: 'absolute', top: 8, right: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="paper-card" style={{ marginTop: 'var(--space-lg)' }}>
        <h3 style={{ marginTop: 0 }}>⚡ Accès rapide</h3>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={async () => {
            try { const r = await api.get('/commandement/etat'); setEtat(r.data); setShowEtat(true) } catch { setMsg('Erreur chargement état') }
          }}>📊 État PDS & Rapports</button>
          <Link to="/ordres" className="btn btn-secondary btn-sm">📜 Ordres</Link>
          <Link to="/calendrier" className="btn btn-secondary btn-sm">📅 Calendrier</Link>
          <Link to="/rapports" className="btn btn-secondary btn-sm">📝 Rapports</Link>
          <Link to="/interdits" className="btn btn-secondary btn-sm">🚫 Interdits</Link>
          <Link to="/pds" className="btn btn-secondary btn-sm">⏱️ PDS</Link>
          <Link to="/admin/stats" className="btn btn-secondary btn-sm">📊 Statistiques</Link>
        </div>
      </div>

      {/* État PDS & Rapports popup */}
      {showEtat && etat && (
        <div className="popup-overlay" onClick={() => setShowEtat(false)}>
          <div className="popup-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, maxHeight: '85vh', overflow: 'auto' }}>
            <button className="popup-close" onClick={() => setShowEtat(false)}>✕</button>
            <h2 style={{ marginTop: 0, textAlign: 'center' }}>📊 État de la semaine</h2>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Semaine du {new Date(etat.weekStart).toLocaleDateString('fr-FR')} — {etat.data?.length || 0} effectifs actifs</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
              <button className={`btn btn-sm ${!etatFilter ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setEtatFilter('')}>Tous</button>
              <button className={`btn btn-sm ${etatFilter === 'pds_manquant' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setEtatFilter('pds_manquant')}>❌ PDS manquant</button>
              <button className={`btn btn-sm ${etatFilter === 'rapport_manquant' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setEtatFilter('rapport_manquant')}>❌ Rapport manquant</button>
              <button className={`btn btn-sm ${etatFilter === 'ok' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setEtatFilter('ok')}>✅ Tout OK</button>
              <select className="form-input" style={{ maxWidth: 180, fontSize: '0.8rem' }} value={etatFilter.startsWith('u:') ? etatFilter : ''} onChange={e => setEtatFilter(e.target.value || '')}>
                <option value="">— Toutes unités —</option>
                {[...new Set((etat.data||[]).map(r => r.unite_code).filter(Boolean))].sort().map(c => (
                  <option key={c} value={`u:${c}`}>{c}</option>
                ))}
              </select>
            </div>

            {(() => {
              let rows = etat.data || []
              if (etatFilter === 'pds_manquant') rows = rows.filter(r => !r.pds_fait)
              else if (etatFilter === 'rapport_manquant') rows = rows.filter(r => !r.rapports_semaine)
              else if (etatFilter === 'ok') rows = rows.filter(r => r.pds_fait && r.rapports_semaine)
              else if (etatFilter.startsWith('u:')) rows = rows.filter(r => r.unite_code === etatFilter.slice(2))

              const totalPds = rows.filter(r => r.pds_fait).length
              const totalRapports = rows.filter(r => r.rapports_semaine).length

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: totalPds === rows.length ? 'var(--success)' : 'var(--warning)' }}>{totalPds}/{rows.length}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PDS remplis</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: totalRapports === rows.length ? 'var(--success)' : 'var(--warning)' }}>{totalRapports}/{rows.length}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ont un rapport</div>
                    </div>
                  </div>
                  <table className="table" style={{ fontSize: '0.8rem' }}>
                    <thead><tr><th>Unité</th><th>Grade</th><th>Nom</th><th style={{ textAlign: 'center' }}>PDS</th><th style={{ textAlign: 'center' }}>Heures</th><th style={{ textAlign: 'center' }}>Rapport</th></tr></thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.id}>
                          <td>{r.unite_code || '—'}</td>
                          <td style={{ fontSize: '0.75rem' }}>{r.grade_nom || '—'}</td>
                          <td><strong>{r.prenom} {r.nom}</strong></td>
                          <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>{r.pds_fait ? '✅' : '❌'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: (r.pds_heures || 0) >= 6 ? 'var(--success)' : 'var(--danger)' }}>{r.pds_heures ? `${r.pds_heures}h` : '—'}</td>
                          <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>{r.rapports_semaine ? `✅ (${r.rapports_semaine})` : '❌'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
