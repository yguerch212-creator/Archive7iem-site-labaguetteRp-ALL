import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'

export default function Moderation() {
  const { user } = useAuth()
  const [data, setData] = useState({ docs: [], permissions: [], rapports: [], interdits: [], media: [] })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [tab, setTab] = useState('docs')

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await api.get('/moderation/pending')
      // Also load pending media
      let mediaData = []
      try {
        const mRes = await api.get('/media/pending')
        mediaData = mRes.data.data || []
      } catch {}
      setData({ ...res.data.data, media: mediaData })
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const flash = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 3000) }
  const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

  const approveDoc = async (id, decision) => {
    try {
      await api.put(`/documentation/${id}/approve`, { decision })
      flash('success', decision === 'approuve' ? '✅ Approuvé' : '❌ Refusé')
      load()
    } catch { flash('error', 'Erreur') }
  }

  const traiterPerm = async (id, statut) => {
    const notes = statut === 'Refusee' ? prompt('Motif du refus :') : null
    try {
      await api.put(`/pds/permissions/${id}/traiter`, { statut, notes })
      flash('success', statut === 'Approuvee' ? '✅ Permission approuvée' : '❌ Permission refusée')
      load()
    } catch { flash('error', 'Erreur') }
  }

  const leverInterdit = async (id) => {
    if (!confirm('Lever cet interdit de front ?')) return
    try {
      await api.put(`/interdits/${id}/lever`)
      flash('success', '✅ Interdit levé')
      load()
    } catch { flash('error', 'Erreur') }
  }

  const moderateMedia = async (id, decision) => {
    try {
      await api.put(`/media/${id}/moderate`, { decision })
      flash('success', decision === 'approuve' ? '✅ Média approuvé' : '❌ Média refusé et supprimé')
      load()
    } catch { flash('error', 'Erreur') }
  }

  const tabs = [
    { key: 'docs', label: '📚 Documents', count: data.docs.length },
    { key: 'permissions', label: '🏖️ Permissions', count: data.permissions.length },
    { key: 'rapports', label: '📝 Rapports récents', count: data.rapports.length },
    { key: 'interdits', label: '🚫 Interdits actifs', count: data.interdits.length },
    { key: 'media', label: '📸 Médias', count: data.media.length },
  ]

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <BackButton label="← Tableau de bord" />
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>🔔 Validation & Modération</h1>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', border: '1px solid var(--border-color)', background: tab === t.key ? 'var(--military-green)' : 'var(--bg-card)',
            color: tab === t.key ? 'white' : 'inherit', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', borderRadius: 'var(--border-radius)'
          }}>
            {t.label} {t.count > 0 && <span style={{ background: tab === t.key ? 'white' : 'var(--danger)', color: tab === t.key ? 'var(--military-green)' : 'white', fontSize: '0.7rem', padding: '1px 6px', borderRadius: 10, marginLeft: 6 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="paper-card" style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div> : (
        <>
          {/* Documents en attente */}
          {tab === 'docs' && (
            <div className="paper-card" style={{ overflow: 'auto' }}>
              {data.docs.length === 0 ? (
                <p style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>✅ Aucun document en attente</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={th}>Document</th><th style={th}>Catégorie</th><th style={th}>Par</th><th style={th}>Date</th><th style={th}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {data.docs.map(d => (
                      <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={td}><strong>{d.titre}</strong>{d.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.description}</div>}</td>
                        <td style={td}>{d.categorie}</td>
                        <td style={td}>{d.created_by_nom}</td>
                        <td style={td}>{fmtDate(d.created_at)}</td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>🔗</a>}
                            <button className="btn btn-sm btn-primary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => approveDoc(d.id, 'approuve')}>✅</button>
                            <button className="btn btn-sm btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => approveDoc(d.id, 'refuse')}>❌</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Permissions */}
          {tab === 'permissions' && (
            <div className="paper-card" style={{ overflow: 'auto' }}>
              {data.permissions.length === 0 ? (
                <p style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>✅ Aucune permission en attente</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={th}>Effectif</th><th style={th}>Du</th><th style={th}>Au</th><th style={th}>Raison</th><th style={th}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {data.permissions.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={td}><strong>{p.grade_nom ? `${p.grade_nom} ` : ''}{p.prenom} {p.nom}</strong><br/><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.unite_code}</span></td>
                        <td style={td}>{fmtDate(p.date_debut)}</td>
                        <td style={td}>{fmtDate(p.date_fin)}</td>
                        <td style={td}>{p.raison}</td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-sm btn-primary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => traiterPerm(p.id, 'Approuvee')}>✅</button>
                            <button className="btn btn-sm btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => traiterPerm(p.id, 'Refusee')}>❌</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Rapports récents */}
          {tab === 'rapports' && (
            <div className="paper-card" style={{ overflow: 'auto' }}>
              {data.rapports.length === 0 ? (
                <p style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>Aucun rapport cette semaine</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={th}>N°</th><th style={th}>Type</th><th style={th}>Titre</th><th style={th}>Auteur</th><th style={th}>Date</th><th style={th}></th>
                  </tr></thead>
                  <tbody>
                    {data.rapports.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{r.numero}</td>
                        <td style={td}>{r.type === 'rapport' ? '📋' : r.type === 'recommandation' ? '⭐' : '⚠️'} {r.type}</td>
                        <td style={td}><Link to={`/rapports/${r.id}`} style={{ fontWeight: 600 }}>{r.titre}</Link></td>
                        <td style={td}>{r.auteur_nom}</td>
                        <td style={td}>{fmtDate(r.date_irl)}</td>
                        <td style={td}><Link to={`/rapports/${r.id}`} className="btn btn-sm btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>👁️</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Médias en attente */}
          {tab === 'media' && (
            <div className="paper-card" style={{ overflow: 'auto' }}>
              {data.media.length === 0 ? (
                <p style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>✅ Aucun média en attente</p>
              ) : (
                <div className="moderation-grid" style={{ padding: 'var(--space-md)' }}>
                  {data.media.map(m => (
                    <div key={m.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                      <div style={{ textAlign: 'center' }}>
                        {m.mime_type?.startsWith('image/') ? (
                          <img src={`/api/media/file/${m.filename}`} alt={m.original_name} style={{ maxWidth: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 4 }} />
                        ) : m.mime_type?.startsWith('video/') ? (
                          <video src={`/api/media/file/${m.filename}`} controls style={{ maxWidth: '100%', maxHeight: 150 }} />
                        ) : (
                          <div style={{ padding: '1.5rem', background: 'var(--border)', borderRadius: 4 }}>📄</div>
                        )}
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.85rem' }}>{m.original_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.uploaded_by_username} · {m.context_type} · {(m.size_bytes / 1024).toFixed(0)} Ko</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-primary" style={{ padding: '2px 8px', fontSize: '0.75rem', flex: 1 }} onClick={() => moderateMedia(m.id, 'approuve')}>✅</button>
                        <button className="btn btn-sm btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem', flex: 1 }} onClick={() => moderateMedia(m.id, 'refuse')}>❌</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Interdits actifs */}
          {tab === 'interdits' && (
            <div className="paper-card" style={{ overflow: 'auto' }}>
              {data.interdits.length === 0 ? (
                <p style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>✅ Aucun interdit actif</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={th}>Effectif</th><th style={th}>Type</th><th style={th}>Motif</th><th style={th}>Depuis</th><th style={th}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {data.interdits.map(i => (
                      <tr key={i.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={td}><strong>{i.effectif_grade ? `${i.effectif_grade} ` : ''}{i.effectif_prenom} {i.effectif_nom}</strong></td>
                        <td style={td}><span className={`badge ${i.type === 'Disciplinaire' ? 'badge-red' : 'badge-warning'}`}>{i.type}</span></td>
                        <td style={td}>{i.motif}</td>
                        <td style={td}>{fmtDate(i.date_debut)}</td>
                        <td style={td}>
                          <button className="btn btn-sm btn-primary" style={{ padding: '2px 10px', fontSize: '0.75rem' }} onClick={() => leverInterdit(i.id)}>🔓 Lever</button>
                        </td>
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
  )
}

const th = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)', whiteSpace: 'nowrap' }
const td = { padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'top' }
