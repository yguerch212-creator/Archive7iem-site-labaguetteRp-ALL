import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import './dossiers.css'

const ENTRY_TYPES = [
  { key: 'note', label: '📝 Note manuelle', desc: 'Rédiger une note libre' },
  { key: 'rapport', label: '📜 Lier un rapport', desc: 'Référencer un rapport existant' },
  { key: 'document', label: '📄 Lier un document', desc: 'Référencer une documentation' },
]

export default function DossierView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dossier, setDossier] = useState(null)
  const [entrees, setEntrees] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  useEffect(() => { load() }, [id])

  const load = async () => {
    try {
      const res = await api.get(`/dossiers/${id}`)
      setDossier(res.data.data.dossier)
      setEntrees(res.data.data.entrees || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const addNote = async (data) => {
    try {
      await api.post(`/dossiers/${id}/entrees`, data)
      setShowForm(false)
      setMessage({ type: 'success', text: 'Entrée ajoutée ✓' })
      setTimeout(() => setMessage(null), 2000)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const deleteEntry = async (entryId) => {
    if (!confirm('Supprimer cette entrée ?')) return
    try { await api.delete(`/dossiers/entrees/${entryId}`); load() } catch {}
  }

  const formatDate = (d) => {
    if (!d) return '—'
    const date = new Date(d)
    if (isNaN(date)) return d
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>
  if (!dossier) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Dossier non trouvé</div>

  const totalPages = entrees.length + 1
  const canWrite = user?.isAdmin || user?.isOfficier || user?.isRecenseur || user?.id === dossier.created_by

  const prevPage = () => setCurrentPage(p => Math.max(0, p - 1))
  const nextPage = () => setCurrentPage(p => Math.min(totalPages - 1, p + 1))

  return (
    <div className="dossier-detail-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-small">← Retour</button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {canWrite && <Link to={`/dossiers/${id}/layout`} className="btn btn-secondary btn-small">🖋️ Mise en page</Link>}
          {canWrite && (
            <button className="btn btn-primary btn-small" onClick={() => setShowForm(true)}>
              + Ajouter une entrée
            </button>
          )}
        </div>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {/* Book */}
      <div className="book-container">
        <div className="book-nav">
          <button className="book-nav-btn" onClick={prevPage} disabled={currentPage === 0}>◀</button>
          <span className="book-page-indicator">
            {currentPage === 0 ? 'Couverture' : `Page ${currentPage} / ${totalPages - 1}`}
          </span>
          <button className="book-nav-btn" onClick={nextPage} disabled={currentPage >= totalPages - 1}>▶</button>
        </div>

        <div className="book-page">
          {currentPage === 0 && (
            <div className="book-cover">
              <div className="book-cover-stamp">GEHEIM</div>
              <div className="book-cover-emblem">✠</div>
              <h1 className="book-cover-title">{dossier.titre}</h1>
              {dossier.description && <p className="book-cover-desc">{dossier.description}</p>}
              <div className="book-cover-meta">
                <span>{dossier.type}</span>
                <span>{dossier.visibilite === 'public' ? '🌐 Public' : dossier.visibilite === 'prive' ? '🔒 Privé' : '🔗 Par lien'}</span>
                <span>{entrees.length} entrée{entrees.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="book-cover-footer">
                Archives du 7e Armeekorps<br/>
                <span style={{ fontSize: '0.7rem' }}>Créé le {formatDate(dossier.created_at)}</span>
              </div>
            </div>
          )}

          {currentPage > 0 && currentPage <= entrees.length && (() => {
            const e = entrees[currentPage - 1]
            return (
              <div className="book-entry">
                <div className="book-entry-header">
                  <span className="book-entry-num">N° {currentPage}</span>
                  <span className="book-entry-date">{e.date_rp || formatDate(e.created_at)}</span>
                </div>
                {e.titre && <h2 className="book-entry-title">{e.titre}</h2>}
                <div className="book-entry-content">{e.contenu}</div>
                <div className="book-entry-footer">
                  <span>Par {e.created_by_nom}</span>
                  <span>{formatDate(e.created_at)}</span>
                  {(user?.isAdmin || user?.id === e.created_by) && (
                    <button className="btn btn-sm" style={{ color: 'var(--danger)', fontSize: '0.7rem', padding: '2px 6px' }} onClick={() => deleteEntry(e.id)}>🗑️</button>
                  )}
                </div>
              </div>
            )
          })()}
        </div>

        {entrees.length > 0 && (
          <div className="book-dots">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} className={`book-dot ${currentPage === i ? 'active' : ''}`} onClick={() => setCurrentPage(i)} />
            ))}
          </div>
        )}
      </div>

      {/* Add entry popup */}
      {showForm && (
        <AddEntryPopup onAdd={addNote} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}

// ==================== Add Entry Popup ====================
function AddEntryPopup({ onAdd, onClose }) {
  const [entryType, setEntryType] = useState(null) // null = type selector
  const [form, setForm] = useState({ type: 'note', titre: '', contenu: '', date_rp: '' })
  const [rapports, setRapports] = useState([])
  const [docs, setDocs] = useState([])
  const [search, setSearch] = useState('')
  const [loadingItems, setLoadingItems] = useState(false)

  const loadRapports = async () => {
    setLoadingItems(true)
    try { const r = await api.get('/rapports'); setRapports(r.data.data || []) } catch {}
    setLoadingItems(false)
  }

  const loadDocs = async () => {
    setLoadingItems(true)
    try { const r = await api.get('/documentation'); setDocs(r.data.data || []) } catch {}
    setLoadingItems(false)
  }

  const selectType = (type) => {
    setEntryType(type)
    if (type === 'rapport') loadRapports()
    if (type === 'document') loadDocs()
  }

  const submitNote = (e) => {
    e.preventDefault()
    if (!form.contenu.trim()) return
    onAdd({ type: 'note', titre: form.titre, contenu: form.contenu, date_rp: form.date_rp })
  }

  const linkRapport = (r) => {
    onAdd({
      type: 'note',
      titre: `📜 ${r.type === 'rapport' ? 'Rapport' : r.type === 'recommandation' ? 'Recommandation' : 'Incident'} — ${r.titre}`,
      contenu: `Rapport lié : ${r.numero || ''}\nAuteur : ${r.auteur_nom || 'Inconnu'}\nDate RP : ${r.date_rp || '—'}\n\n${r.contexte || r.resume || r.compte_rendu || ''}`.trim(),
      date_rp: r.date_rp || ''
    })
  }

  const linkDoc = (d) => {
    onAdd({
      type: 'note',
      titre: `📄 ${d.titre}`,
      contenu: `Document lié : ${d.titre}\nType : ${d.type || '—'}\nURL : ${d.url || '—'}\n${d.description || ''}`.trim(),
      date_rp: ''
    })
  }

  const filteredRapports = rapports.filter(r =>
    `${r.titre} ${r.numero} ${r.auteur_nom}`.toLowerCase().includes(search.toLowerCase())
  )
  const filteredDocs = docs.filter(d =>
    `${d.titre} ${d.type || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" style={{ maxWidth: 600, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>✕</button>

        {/* Step 1: Choose type */}
        {!entryType && (
          <>
            <h2 style={{ margin: '0 0 var(--space-lg)' }}>+ Ajouter au dossier</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {ENTRY_TYPES.map(t => (
                <button key={t.key} onClick={() => selectType(t.key)}
                  className="paper-card" style={{ cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)', marginBottom: 0, border: '2px solid var(--border-color)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--military-green)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <span style={{ fontSize: '1.5rem' }}>{t.label.split(' ')[0]}</span>
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{t.label.slice(t.label.indexOf(' ') + 1)}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2a: Note form */}
        {entryType === 'note' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
              <button className="btn btn-secondary btn-small" onClick={() => setEntryType(null)}>←</button>
              <h2 style={{ margin: 0 }}>📝 Nouvelle note</h2>
            </div>
            <form onSubmit={submitNote}>
              <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
                <div className="form-group" style={{ flex: 2, minWidth: 180 }}>
                  <label className="form-label">Titre</label>
                  <input type="text" className="form-input" value={form.titre} onChange={e => setForm(p => ({...p, titre: e.target.value}))} placeholder="Objet de la note..." />
                </div>
                <div className="form-group" style={{ minWidth: 120 }}>
                  <label className="form-label">Date RP</label>
                  <input type="text" className="form-input" value={form.date_rp} onChange={e => setForm(p => ({...p, date_rp: e.target.value}))} placeholder="xx/xx/1944" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Contenu *</label>
                <textarea className="form-input" value={form.contenu} onChange={e => setForm(p => ({...p, contenu: e.target.value}))} required rows={8} style={{ resize: 'vertical', minHeight: 120 }} placeholder="Rédigez votre note..." />
              </div>
              <button type="submit" className="btn btn-primary">📝 Ajouter la note</button>
            </form>
          </>
        )}

        {/* Step 2b: Link rapport */}
        {entryType === 'rapport' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              <button className="btn btn-secondary btn-small" onClick={() => setEntryType(null)}>←</button>
              <h2 style={{ margin: 0 }}>📜 Lier un rapport</h2>
            </div>
            <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Rechercher par titre, numéro, auteur..." style={{ marginBottom: 'var(--space-md)' }} />
            {loadingItems ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</p> : (
              <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                {filteredRapports.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>Aucun rapport trouvé</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={th}>N°</th>
                        <th style={th}>Titre</th>
                        <th style={th}>Auteur</th>
                        <th style={th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRapports.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={td}><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{r.numero}</span></td>
                          <td style={td}><strong>{r.titre}</strong></td>
                          <td style={td}>{r.auteur_nom || '—'}</td>
                          <td style={td}><button className="btn btn-primary btn-small" onClick={() => linkRapport(r)}>+ Lier</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}

        {/* Step 2c: Link document */}
        {entryType === 'document' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              <button className="btn btn-secondary btn-small" onClick={() => setEntryType(null)}>←</button>
              <h2 style={{ margin: 0 }}>📄 Lier un document</h2>
            </div>
            <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Rechercher un document..." style={{ marginBottom: 'var(--space-md)' }} />
            {loadingItems ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</p> : (
              <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                {filteredDocs.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>Aucun document trouvé</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={th}>Titre</th>
                        <th style={th}>Type</th>
                        <th style={th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocs.map(d => (
                        <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={td}><strong>{d.titre}</strong></td>
                          <td style={td}>{d.type || '—'}</td>
                          <td style={td}><button className="btn btn-primary btn-small" onClick={() => linkDoc(d)}>+ Lier</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: 'var(--space-xs) var(--space-sm)', fontWeight: 700, color: 'var(--military-dark)', whiteSpace: 'nowrap' }
const td = { padding: 'var(--space-xs) var(--space-sm)', verticalAlign: 'middle' }
