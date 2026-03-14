import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'

export default function BataillonsList() {
  const { user } = useAuth()
  const [bataillons, setBataillons] = useState([])
  const [bdm, setBdm] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => { load() }, [])

  const load = () => api.get('/bataillons').then(r => {
    setBataillons(r.data.data || [])
    setBdm(r.data.bataillonDuMois)
  }).catch(() => {})

  if (selected) return <BataillonDetail id={selected} onBack={() => setSelected(null)} user={user} reload={load} />

  return (
    <div style={{ padding: 'var(--space-lg)' }}>
      <BackButton />
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 'var(--space-md)' }}>Bataillons de Combat</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)', fontSize: '0.9rem' }}>
        851e et 852e bataillons du 916e Grenadier Regiment — Rivalite sans haine.
      </p>

      {bdm && (
        <div style={{ background: 'rgba(161,124,71,0.15)', border: '2px solid var(--warning)', borderRadius: 8, padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Bataillon du Mois — {bdm.mois}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)', margin: '4px 0' }}>
            {bataillons.find(b => b.id === bdm.bataillon_id)?.nom || '?'}
          </div>
          {bdm.motif && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{bdm.motif}</div>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
        {bataillons.map(b => (
          <div key={b.id} onClick={() => b.isMember ? setSelected(b.id) : null} style={{
            background: '#f5f2e8', border: '1px solid var(--border-color)', borderRadius: 8,
            padding: 'var(--space-lg)', cursor: b.isMember ? 'pointer' : 'not-allowed', transition: 'all 0.2s', borderLeft: `4px solid ${b.couleur}`,
            position: 'relative', opacity: b.isMember ? 1 : 0.7
          }}
          onMouseEnter={e => b.isMember && (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={e => e.currentTarget.style.transform = ''}>
            {bdm?.bataillon_id === b.id && <div style={{ position: 'absolute', top: 8, right: 12, fontSize: '0.65rem', fontWeight: 700, background: 'var(--warning)', color: '#fff', padding: '2px 8px', borderRadius: 10 }}>DU MOIS</div>}
            {!b.isMember && <div style={{ position: 'absolute', top: 8, right: 12, fontSize: '0.65rem', fontWeight: 600, background: 'var(--border-color)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 10 }}>ACCES RESTREINT</div>}
            <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{b.nom}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>{b.description}</div>
            {b.chef_nom && <div style={{ marginTop: 8, fontSize: '0.85rem' }}>Chef : <strong>{b.chef_grade} {b.chef_prenom} {b.chef_nom}</strong></div>}
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 12 }}>
              <Stat label="Membres" value={b.nb_membres} />
              <Stat label="Ordres actifs" value={b.ordres_actifs} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary-color)' }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    </div>
  )
}

// ==================== BATAILLON DETAIL ====================
function BataillonDetail({ id, onBack, user, reload }) {
  const [bat, setBat] = useState(null)
  const [tab, setTab] = useState('ordres')
  const [ordres, setOrdres] = useState([])
  const [messages, setMessages] = useState([])
  const [media, setMedia] = useState([])
  const [msg, setMsg] = useState('')
  const [newMsg, setNewMsg] = useState('')

  const isOfficier = user?.isAdmin || user?.isOfficier || user?.isEtatMajor

  useEffect(() => { loadAll() }, [id])

  const loadAll = () => {
    api.get(`/bataillons/${id}`).then(r => setBat(r.data.data)).catch(() => {})
    api.get(`/bataillons/${id}/ordres`).then(r => setOrdres(r.data.data || [])).catch(() => {})
    api.get(`/bataillons/${id}/messages`).then(r => setMessages(r.data.data || [])).catch(() => {})
    api.get(`/bataillons/${id}/media`).then(r => setMedia(r.data.data || [])).catch(() => {})
  }

  const toggleTache = (tacheId) => {
    api.put(`/bataillons/ordres/taches/${tacheId}/toggle`).then(() => {
      loadAll()
    }).catch(() => setMsg('Erreur'))
  }

  const sendMessage = () => {
    if (!newMsg.trim()) return
    api.post(`/bataillons/${id}/messages`, { contenu: newMsg }).then(() => {
      setNewMsg('')
      api.get(`/bataillons/${id}/messages`).then(r => setMessages(r.data.data || []))
    }).catch(() => setMsg('Erreur'))
  }

  if (!bat) return <div style={{ padding: 'var(--space-lg)' }}>Chargement...</div>

  const tabs = [
    { key: 'ordres', label: 'Ordres de Mission', icon: '📋' },
    { key: 'membres', label: 'Effectifs', icon: '👥' },
    { key: 'discussion', label: 'Discussion', icon: '💬' },
    { key: 'decorations', label: 'Decorations', icon: '🎖️' },
    { key: 'media', label: 'Propagande', icon: '📸' },
    { key: 'palmares', label: 'Palmares', icon: '🏆' },
  ]

  return (
    <div style={{ padding: 'var(--space-lg)' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>← Retour</button>
      
      <div style={{ borderLeft: `4px solid ${bat.couleur}`, paddingLeft: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', margin: 0 }}>{bat.nom}</h1>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{bat.description}</div>
        {bat.chef_nom && <div style={{ marginTop: 4, fontSize: '0.9rem' }}>Commandant : <strong>{bat.chef_grade} {bat.chef_prenom} {bat.chef_nom}</strong></div>}
      </div>

      {msg && <div className="alert alert-info" style={{ marginBottom: 'var(--space-md)' }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 14px', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer', fontSize: '0.82rem', fontWeight: tab === t.key ? 700 : 400,
            background: tab === t.key ? 'var(--paper-bg)' : 'transparent', color: tab === t.key ? 'var(--text-color)' : 'var(--text-muted)',
            borderBottom: tab === t.key ? '2px solid var(--primary-color)' : '2px solid transparent'
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ORDRES DE MISSION */}
      {tab === 'ordres' && (
        <div>
          {isOfficier && <OrdreForm bataillonId={id} onCreated={loadAll} />}
          {ordres.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Aucun ordre de mission.</p> : ordres.map(o => (
            <div key={o.id} style={{ background: '#f5f2e8', border: '1px solid var(--border-color)', borderRadius: 8, padding: 'var(--space-md)', marginBottom: 'var(--space-sm)',
              borderLeft: `3px solid ${o.priorite === 'critique' ? 'var(--error)' : o.priorite === 'urgente' ? 'var(--warning)' : 'var(--success)'}`,
              opacity: o.statut === 'annule' ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{o.titre}</strong>
                  <span className={`badge ${o.statut === 'termine' ? 'badge-success' : o.statut === 'annule' ? 'badge-muted' : 'badge-warning'}`} style={{ marginLeft: 8, fontSize: '0.7rem' }}>{o.statut.replace('_', ' ')}</span>
                  {o.priorite !== 'normale' && <span className={`badge ${o.priorite === 'critique' ? 'badge-danger' : 'badge-warning'}`} style={{ marginLeft: 4, fontSize: '0.65rem' }}>{o.priorite}</span>}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>par {o.created_by_nom} — {new Date(o.created_at).toLocaleDateString('fr')}</span>
              </div>
              {o.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '6px 0' }}>{o.description}</p>}
              {o.taches?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {o.taches.map(t => (
                    <div key={t.id} onClick={() => o.statut !== 'annule' && toggleTache(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: o.statut === 'annule' ? 'default' : 'pointer', fontSize: '0.85rem' }}>
                      <span style={{ width: 18, height: 18, border: '2px solid var(--border-color)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.completed ? 'var(--success)' : 'transparent', color: '#fff', fontSize: '0.7rem', flexShrink: 0 }}>
                        {t.completed ? '✓' : ''}
                      </span>
                      <span style={{ textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? 'var(--text-muted)' : 'var(--text-color)' }}>{t.description}</span>
                      {t.completed_by_nom && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({t.completed_by_nom})</span>}
                    </div>
                  ))}
                  <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {o.taches_completees}/{o.total_taches} taches completees
                  </div>
                </div>
              )}
              {isOfficier && o.statut === 'en_cours' && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button onClick={() => api.put(`/bataillons/ordres/${o.id}/statut`, { statut: 'termine' }).then(loadAll)} className="btn btn-sm" style={{ fontSize: '0.75rem' }}>Terminer</button>
                  <button onClick={() => api.put(`/bataillons/ordres/${o.id}/statut`, { statut: 'annule' }).then(loadAll)} className="btn btn-sm btn-outline" style={{ fontSize: '0.75rem' }}>Annuler</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MEMBRES */}
      {tab === 'membres' && (
        <div>
          {isOfficier && <MembreForm bataillonId={id} onAdded={loadAll} />}
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>{bat.membres?.length || 0} membres</div>
          <table className="table" style={{ width: '100%' }}>
            <thead><tr><th>Nom</th><th>Grade</th><th>Role</th>{isOfficier && <th></th>}</tr></thead>
            <tbody>
              {(bat.membres || []).map(m => (
                <tr key={m.id}>
                  <td><strong>{m.prenom} {m.nom}</strong>{m.surnom ? ` "${m.surnom}"` : ''}</td>
                  <td>{m.grade_nom || '—'}</td>
                  <td><span className={`badge ${m.role === 'officier' ? 'badge-warning' : 'badge-muted'}`}>{m.role}</span></td>
                  {isOfficier && <td><button onClick={() => api.delete(`/bataillons/${id}/membres/${m.effectif_id}`).then(loadAll)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '0.8rem' }}>Retirer</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DISCUSSION */}
      {tab === 'discussion' && (
        <div>
          <div style={{ maxHeight: 400, overflowY: 'auto', background: '#f5f2e8', border: '1px solid var(--border-color)', borderRadius: 8, padding: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
            {messages.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Aucun message.</p> : messages.map(m => (
              <div key={m.id} style={{ marginBottom: 10, padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '0.85rem' }}>{m.grade_nom ? `${m.grade_nom} ` : ''}{m.eff_prenom || m.user_prenom} {m.eff_nom || m.user_nom}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleString('fr')}</span>
                </div>
                <div style={{ fontSize: '0.9rem', marginTop: 2 }}>{m.contenu}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Votre message..." className="input" style={{ flex: 1 }} />
            <button onClick={sendMessage} className="btn btn-primary">Envoyer</button>
          </div>
        </div>
      )}

      {/* DECORATIONS */}
      {tab === 'decorations' && (
        <div>
          {(bat.decorations || []).length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Aucune decoration pour ce bataillon.</p> :
            (bat.decorations || []).map(d => (
              <div key={d.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                {d.image_url && <img src={d.image_url} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />}
                <div>
                  <strong>{d.decoration_nom || d.nom_custom}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.effectif_prenom} {d.effectif_nom} — {d.date_attribution || '?'}</div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* MEDIA / PROPAGANDE */}
      {tab === 'media' && (
        <div>
          {isOfficier && <MediaForm bataillonId={id} onAdded={loadAll} />}
          {media.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Aucun media.</p> :
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {media.map(m => (
                <div key={m.id} style={{ background: '#f5f2e8', border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
                  {m.type === 'photo' ? <img src={m.url} alt={m.titre || ''} style={{ width: '100%', height: 160, objectFit: 'cover' }} /> :
                    <video src={m.url} controls style={{ width: '100%', height: 160, objectFit: 'cover' }} />}
                  <div style={{ padding: 8, fontSize: '0.8rem' }}>
                    {m.titre && <div style={{ fontWeight: 600 }}>{m.titre}</div>}
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{m.uploaded_by_nom} — {new Date(m.created_at).toLocaleDateString('fr')}</div>
                    {isOfficier && <button onClick={() => api.delete(`/bataillons/media/${m.id}`).then(loadAll)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '0.7rem', marginTop: 4 }}>Supprimer</button>}
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* PALMARES */}
      {tab === 'palmares' && (
        <div>
          {isOfficier && <BdmForm bataillons={[bat]} onSet={loadAll} />}
          {(bat.palmares || []).length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Pas encore de titre.</p> :
            (bat.palmares || []).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '1.5rem' }}>🏆</span>
                <div>
                  <strong>Bataillon du Mois — {p.mois}</strong>
                  {p.motif && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.motif}</div>}
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ==================== FORMS ====================

function OrdreForm({ bataillonId, onCreated }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ titre: '', description: '', priorite: 'normale', taches: [{ description: '' }] })

  const addTache = () => setForm(f => ({ ...f, taches: [...f.taches, { description: '' }] }))
  const updateTache = (i, val) => setForm(f => ({ ...f, taches: f.taches.map((t, idx) => idx === i ? { description: val } : t) }))
  const removeTache = (i) => setForm(f => ({ ...f, taches: f.taches.filter((_, idx) => idx !== i) }))

  const submit = () => {
    if (!form.titre.trim()) return
    api.post(`/bataillons/${bataillonId}/ordres`, form).then(() => {
      setForm({ titre: '', description: '', priorite: 'normale', taches: [{ description: '' }] })
      setOpen(false)
      onCreated()
    }).catch(() => {})
  }

  if (!open) return <button onClick={() => setOpen(true)} className="btn btn-primary" style={{ marginBottom: 'var(--space-md)' }}>+ Nouvel ordre de mission</button>

  return (
    <div style={{ background: '#f5f2e8', border: '1px solid var(--border-color)', borderRadius: 8, padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
      <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="Titre de l'ordre" className="input" style={{ width: '100%', marginBottom: 8 }} />
      <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optionnel)" className="input" rows={2} style={{ width: '100%', marginBottom: 8 }} />
      <select value={form.priorite} onChange={e => setForm(f => ({ ...f, priorite: e.target.value }))} className="input" style={{ marginBottom: 8 }}>
        <option value="normale">Priorite normale</option>
        <option value="urgente">Urgente</option>
        <option value="critique">Critique</option>
      </select>
      <div style={{ marginBottom: 8 }}>
        <strong style={{ fontSize: '0.85rem' }}>Taches :</strong>
        {form.taches.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input value={t.description} onChange={e => updateTache(i, e.target.value)} placeholder={`Tache ${i + 1}`} className="input" style={{ flex: 1 }} />
            {form.taches.length > 1 && <button onClick={() => removeTache(i)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>✕</button>}
          </div>
        ))}
        <button onClick={addTache} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.8rem', marginTop: 4 }}>+ Ajouter une tache</button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={submit} className="btn btn-primary">Creer l'ordre</button>
        <button onClick={() => setOpen(false)} className="btn btn-outline">Annuler</button>
      </div>
    </div>
  )
}

function MembreForm({ bataillonId, onAdded }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])

  const doSearch = (q) => {
    setSearch(q)
    if (q.length < 2) { setResults([]); return }
    api.get('/effectifs').then(r => {
      const all = r.data.data || []
      const filtered = all.filter(e => `${e.prenom} ${e.nom}`.toLowerCase().includes(q.toLowerCase()))
      setResults(filtered.slice(0, 10))
    })
  }

  const add = (effectifId, role) => {
    api.post(`/bataillons/${bataillonId}/membres`, { effectif_id: effectifId, role }).then(() => {
      setSearch('')
      setResults([])
      onAdded()
    })
  }

  if (!open) return <button onClick={() => setOpen(true)} className="btn btn-sm" style={{ marginBottom: 'var(--space-md)' }}>+ Ajouter un membre</button>

  return (
    <div style={{ background: '#f5f2e8', border: '1px solid var(--border-color)', borderRadius: 8, padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
      <input value={search} onChange={e => doSearch(e.target.value)} placeholder="Rechercher un effectif..." className="input" style={{ width: '100%', marginBottom: 8 }} />
      {results.map(e => (
        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.85rem' }}>{e.grade_nom} {e.prenom} {e.nom}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => add(e.id, 'membre')} className="btn btn-sm" style={{ fontSize: '0.7rem' }}>Membre</button>
            <button onClick={() => add(e.id, 'officier')} className="btn btn-sm" style={{ fontSize: '0.7rem', background: 'var(--warning)' }}>Officier</button>
          </div>
        </div>
      ))}
      <button onClick={() => setOpen(false)} className="btn btn-sm btn-outline" style={{ marginTop: 8 }}>Fermer</button>
    </div>
  )
}

function MediaForm({ bataillonId, onAdded }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ url: '', titre: '', type: 'photo' })

  const submit = () => {
    if (!form.url.trim()) return
    api.post(`/bataillons/${bataillonId}/media`, form).then(() => {
      setForm({ url: '', titre: '', type: 'photo' })
      setOpen(false)
      onAdded()
    })
  }

  if (!open) return <button onClick={() => setOpen(true)} className="btn btn-sm" style={{ marginBottom: 'var(--space-md)' }}>+ Ajouter un media</button>

  return (
    <div style={{ background: '#f5f2e8', border: '1px solid var(--border-color)', borderRadius: 8, padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
      <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="URL de l'image ou video" className="input" style={{ width: '100%', marginBottom: 8 }} />
      <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="Titre (optionnel)" className="input" style={{ width: '100%', marginBottom: 8 }} />
      <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input" style={{ marginBottom: 8 }}>
        <option value="photo">Photo</option>
        <option value="video">Video</option>
      </select>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={submit} className="btn btn-primary">Ajouter</button>
        <button onClick={() => setOpen(false)} className="btn btn-outline">Annuler</button>
      </div>
    </div>
  )
}

function BdmForm({ bataillons, onSet }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ bataillon_id: '', mois: '', motif: '' })

  const submit = () => {
    if (!form.bataillon_id || !form.mois) return
    api.post('/bataillons/du-mois', form).then(() => { setOpen(false); onSet() })
  }

  if (!open) return <button onClick={() => setOpen(true)} className="btn btn-sm" style={{ marginBottom: 'var(--space-md)', background: 'var(--warning)', color: '#fff' }}>Decerner Bataillon du Mois</button>

  return (
    <div style={{ background: '#f5f2e8', border: '1px solid var(--border-color)', borderRadius: 8, padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
      <input type="month" value={form.mois} onChange={e => setForm(f => ({ ...f, mois: e.target.value }))} className="input" style={{ marginBottom: 8 }} />
      <select value={form.bataillon_id} onChange={e => setForm(f => ({ ...f, bataillon_id: e.target.value }))} className="input" style={{ marginBottom: 8 }}>
        <option value="">Choisir un bataillon</option>
        {bataillons.map(b => <option key={b.id} value={b.id}>{b.nom || b.numero}</option>)}
      </select>
      <textarea value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} placeholder="Motif" className="input" rows={2} style={{ width: '100%', marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={submit} className="btn btn-primary">Decerner</button>
        <button onClick={() => setOpen(false)} className="btn btn-outline">Annuler</button>
      </div>
    </div>
  )
}
