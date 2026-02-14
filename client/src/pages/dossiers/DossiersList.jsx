import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import { formatDate } from '../../utils/dates'
import './dossiers.css'

const TYPE_ICONS = { personnel: '📁', thematique: '📂', enquete: '🔍', autre: '📋' }
const ACCESS_LABELS = { tous: '🌐 Tous', officier: '⭐ Officiers', sous_officier: '🎖️ Sous-off', militaire: '🪖 Troupes', prive: '🔒 Privé' }

export default function DossiersList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dossiers, setDossiers] = useState([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titre: '', type: 'thematique', description: '', visibilite: 'public', access_group: 'tous' })
  const [message, setMessage] = useState(null)
  const [myDossier, setMyDossier] = useState(null)

  const canCreate = user?.isAdmin || user?.isOfficier || user?.isRecenseur

  useEffect(() => { load(); loadMine() }, [])

  const loadMine = async () => {
    if (!user?.effectif_id) return
    try {
      const res = await api.get(`/dossiers/effectif/${user.effectif_id}`)
      setMyDossier(res.data.data)
    } catch {}
  }

  const load = async () => {
    try {
      const res = await api.get('/dossiers')
      setDossiers(res.data.data || [])
    } catch {}
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/dossiers', form)
      setShowForm(false)
      setForm({ titre: '', type: 'thematique', description: '', visibilite: 'public', access_group: 'tous' })
      setMessage({ type: 'success', text: 'Dossier créé ✓' })
      setTimeout(() => setMessage(null), 2000)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const [tab, setTab] = useState('dossiers') // 'dossiers' | 'effectifs'
  const [allEffectifs, setAllEffectifs] = useState([])

  useEffect(() => {
    api.get('/effectifs/all').then(r => setAllEffectifs(r.data.data || [])).catch(() => {})
  }, [])

  const [filterUnite, setFilterUnite] = useState('')
  const [unitesAll, setUnitesAll] = useState([])

  useEffect(() => { api.get('/unites').then(r => setUnitesAll(r.data.data || r.data)).catch(() => {}) }, [])

  const filteredEffectifs = allEffectifs.filter(e => {
    if (search && !`${e.prenom} ${e.nom} ${e.grade_nom || ''} ${e.unite_nom || ''}`.toLowerCase().includes(search.toLowerCase())) return false
    if (filterUnite && e.unite_id != filterUnite) return false
    return true
  }).sort((a, b) => (a.unite_code || '').localeCompare(b.unite_code || '') || (b.grade_rang || 0) - (a.grade_rang || 0))

  const nonPersonal = dossiers.filter(d => d.type !== 'personnel')
  const filtered = nonPersonal.filter(d => {
    if (search && !`${d.titre} ${d.description || ''} ${d.created_by_nom || ''}`.toLowerCase().includes(search.toLowerCase())) return false
    if (filterType && d.type !== filterType) return false
    return true
  })

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <BackButton label="← Tableau de bord" />
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {canCreate && (
            <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>
              {showForm ? '✕ Annuler' : '+ Nouveau dossier'}
            </button>
          )}
        </div>
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>📁 Dossiers</h1>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {/* Mon dossier personnel */}
      {myDossier && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)', cursor: 'pointer' }} onClick={() => navigate(`/dossiers/effectif/${user.effectif_id}`)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <strong style={{ fontSize: '1rem' }}>📋 Mon dossier personnel</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {myDossier.rapports?.length || 0} rapports · {myDossier.interdits?.length || 0} interdits · {myDossier.medical?.length || 0} visites · {myDossier.entrees?.length || 0} notes
              </div>
            </div>
            <span className="btn btn-primary btn-small">Consulter →</span>
          </div>
        </div>
      )}

      {/* Formulaire création */}
      {showForm && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>Nouveau dossier</h3>
          <form onSubmit={submit}>
            <div className="form-row" style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
                <label className="form-label">Titre *</label>
                <input type="text" className="form-input" value={form.titre} onChange={e => setForm(p => ({...p, titre: e.target.value}))} required placeholder="Titre du dossier..." />
              </div>
              <div className="form-group" style={{ minWidth: 140 }}>
                <label className="form-label">Type</label>
                <select className="form-input" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                  <option value="thematique">📂 Thématique</option>
                  <option value="enquete">🔍 Enquête</option>
                  <option value="autre">📋 Autre</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Accès</label>
              <select className="form-input" value={form.access_group} onChange={e => {
                const v = e.target.value
                setForm(p => ({...p, access_group: v, visibilite: v === 'prive' ? 'prive' : 'public'}))
              }}>
                <option value="tous">🌐 Tout le monde</option>
                <option value="officier">⭐ Officiers uniquement</option>
                <option value="sous_officier">🎖️ Sous-officiers et +</option>
                <option value="militaire">🪖 Tous les militaires</option>
                <option value="prive">🔒 Privé</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={2} placeholder="Description optionnelle..." style={{ resize: 'vertical', minHeight: 60 }} />
            </div>
            <button type="submit" className="btn btn-primary">📁 Créer</button>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <button className={`btn ${tab === 'dossiers' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('dossiers')}>📂 Dossiers ({nonPersonal.length})</button>
        <button className={`btn ${tab === 'effectifs' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('effectifs')}>👤 Par effectif ({allEffectifs.length})</button>
      </div>

      {/* Recherche + filtre */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <input className="form-input" style={{ maxWidth: 300 }} placeholder={tab === 'dossiers' ? '🔍 Rechercher un dossier...' : '🔍 Rechercher un effectif...'} value={search} onChange={e => setSearch(e.target.value)} />
        {tab === 'effectifs' && <select className="form-input" style={{ maxWidth: 200 }} value={filterUnite} onChange={e => setFilterUnite(e.target.value)}>
          <option value="">— Toutes unités —</option>
          {unitesAll.map(u => <option key={u.id} value={u.id}>{u.code}. {u.nom}</option>)}
        </select>}
        {tab === 'dossiers' && <select className="form-input" style={{ maxWidth: 180 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">— Tous types —</option>
          <option value="thematique">📂 Thématique</option>
          <option value="enquete">🔍 Enquête</option>
          <option value="autre">📋 Autre</option>
        </select>}
      </div>

      {/* Effectifs tab */}
      {tab === 'effectifs' && (
        <div className="paper-card" style={{ overflow: 'auto', marginBottom: 'var(--space-xl)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={th}>Unité</th><th style={th}>Grade</th><th style={th}>Nom</th><th style={th}>Prénom</th>
            </tr></thead>
            <tbody>
              {filteredEffectifs.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>Aucun effectif</td></tr>
              ) : filteredEffectifs.map(e => (
                <tr key={e.id} onClick={() => navigate(`/dossiers/effectif/${e.id}`)}
                  style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(107,143,60,0.08)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = ''}>
                  <td style={td}><span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{e.unite_code || '—'}</span></td>
                  <td style={td}>{e.grade_nom || '—'}</td>
                  <td style={td}><strong>{e.nom}</strong></td>
                  <td style={td}>{e.prenom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dossiers Tableau */}
      {tab === 'dossiers' && (
      <div className="paper-card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={th}>Type</th>
              <th style={th}>Titre</th>
              <th style={th}>Accès</th>
              <th style={th}>Entrées</th>
              <th style={th}>Créé par</th>
              {user?.isAdmin && <th style={th}></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>Aucun dossier trouvé</td></tr>
            ) : filtered.map(d => (
              <tr key={d.id}
                onClick={() => navigate(d.type === 'personnel' ? `/dossiers/effectif/${d.effectif_id}` : `/dossiers/${d.id}`)}
                style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={ev => ev.currentTarget.style.background = 'var(--military-light, rgba(107,143,60,0.08))'}
                onMouseLeave={ev => ev.currentTarget.style.background = ''}
              >
                <td style={td}><span style={{ fontSize: '1.1rem' }}>{TYPE_ICONS[d.type]}</span></td>
                <td style={td}>
                  <strong>{d.titre}</strong>
                  {d.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{d.description.slice(0, 80)}{d.description.length > 80 ? '...' : ''}</div>}
                </td>
                <td style={td}><span style={{ fontSize: '0.8rem' }}>{ACCESS_LABELS[d.access_group] || '🌐'}</span></td>
                <td style={td}><strong>{d.nb_entrees || 0}</strong></td>
                <td style={td}><span style={{ fontSize: '0.8rem' }}>{d.created_by_nom || '—'}</span></td>
                {user?.isAdmin && <td style={td} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-danger btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={async () => {
                    if (!confirm(`Supprimer le dossier "${d.titre}" ?`)) return
                    try { await api.delete(`/dossiers/${d.id}`); load(); setMessage({ type: 'success', text: 'Dossier supprimé ✓' }); setTimeout(() => setMessage(null), 2000) }
                    catch { setMessage({ type: 'error', text: 'Erreur suppression' }) }
                  }}>🗑️</button>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}

const th = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)', whiteSpace: 'nowrap' }
const td = { padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'middle' }
