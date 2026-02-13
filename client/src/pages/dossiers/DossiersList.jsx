import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import './dossiers.css'

const TYPE_ICONS = { personnel: '📁', thematique: '📂', enquete: '🔍', autre: '📋' }
const TYPE_LABELS = { personnel: 'Personnel', thematique: 'Thématique', enquete: 'Enquête', autre: 'Autre' }
const VIS_ICONS = { public: '🌐', prive: '🔒', lien: '🔗' }

export default function DossiersList() {
  const { user } = useAuth()
  const [dossiers, setDossiers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titre: '', type: 'thematique', description: '', visibilite: 'public' })
  const [message, setMessage] = useState(null)

  const [myDossier, setMyDossier] = useState(null)
  const canCreate = user?.isAdmin || user?.isOfficier || user?.isRecenseur

  useEffect(() => { load(); loadMine() }, [])

  const loadMine = async () => {
    if (!user?.effectif_id) return
    try {
      const res = await api.get(`/dossiers/effectif/${user.effectif_id}`)
      setMyDossier(res.data.data)
    } catch (err) { console.error(err) }
  }

  const load = async () => {
    try {
      const res = await api.get('/dossiers')
      setDossiers(res.data.data || [])
    } catch (err) { console.error(err) }
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/dossiers', form)
      setShowForm(false)
      setForm({ titre: '', type: 'thematique', description: '', visibilite: 'public' })
      setMessage({ type: 'success', text: 'Dossier créé' })
      setTimeout(() => setMessage(null), 2000)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const personal = dossiers.filter(d => d.type === 'personnel')
  const other = dossiers.filter(d => d.type !== 'personnel')

  return (
    <div className="dossiers-page">
      <Link to="/dashboard" className="btn-back">← Tableau de bord</Link>
      <div className="dossiers-header">
        <h1>📁 Dossiers</h1>
        {canCreate && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Annuler' : '+ Nouveau dossier'}
          </button>
        )}
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="alert-close">✕</button>
        </div>
      )}

      {showForm && (
        <div className="card dossier-form">
          <h3>Nouveau dossier</h3>
          <form onSubmit={submit}>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Titre *</label>
                <input type="text" className="form-input" value={form.titre} onChange={e => setForm(p => ({...p, titre: e.target.value}))} required placeholder="Titre du dossier..." />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                  <option value="thematique">📂 Thématique</option>
                  <option value="enquete">🔍 Enquête</option>
                  <option value="autre">📋 Autre</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Visibilité</label>
                <select className="form-input" value={form.visibilite} onChange={e => setForm(p => ({...p, visibilite: e.target.value}))}>
                  <option value="public">🌐 Public</option>
                  <option value="prive">🔒 Privé</option>
                  <option value="lien">🔗 Par lien</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input form-textarea" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={2} placeholder="Description optionnelle..." />
            </div>
            <button type="submit" className="btn btn-primary">📁 Créer le dossier</button>
          </form>
        </div>
      )}

      {/* My own dossier */}
      {myDossier && (
        <div className="dossier-section">
          <h2 className="dossier-section-title">📋 Mon dossier personnel</h2>
          <Link to={`/dossiers/effectif/${user.effectif_id}`} className="card dossier-my-card">
            <div className="dossier-my-stats">
              <div className="dossier-my-stat">
                <span className="dossier-my-stat-num">{myDossier.rapports?.length || 0}</span>
                <span className="dossier-my-stat-label">📋 Rapports</span>
              </div>
              <div className="dossier-my-stat">
                <span className="dossier-my-stat-num">{myDossier.interdits?.length || 0}</span>
                <span className="dossier-my-stat-label">🚫 Interdits</span>
              </div>
              <div className="dossier-my-stat">
                <span className="dossier-my-stat-num">{myDossier.medical?.length || 0}</span>
                <span className="dossier-my-stat-label">🏥 Visites</span>
              </div>
              <div className="dossier-my-stat">
                <span className="dossier-my-stat-num">{myDossier.entrees?.length || 0}</span>
                <span className="dossier-my-stat-label">📝 Notes</span>
              </div>
            </div>
            <span className="btn btn-sm btn-primary" style={{ marginTop: '0.75rem' }}>Consulter mon dossier →</span>
          </Link>
        </div>
      )}

      {/* Personal dossiers */}
      {personal.length > 0 && (
        <div className="dossier-section">
          <h2 className="dossier-section-title">📁 Dossiers personnels</h2>
          <div className="dossier-grid">
            {personal.map(d => (
              <Link key={d.id} to={`/dossiers/effectif/${d.effectif_id}`} className="card dossier-card">
                <div className="dossier-card-icon">📁</div>
                <div className="dossier-card-info">
                  <h3>{d.effectif_grade ? `${d.effectif_grade} ` : ''}{d.effectif_prenom} {d.effectif_nom}</h3>
                  <span className="dossier-card-meta">{d.effectif_unite_code} · {d.nb_entrees} entrée{d.nb_entrees !== 1 ? 's' : ''}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Other dossiers */}
      {other.length > 0 && (
        <div className="dossier-section">
          <h2 className="dossier-section-title">📂 Dossiers thématiques & enquêtes</h2>
          <div className="dossier-grid">
            {other.map(d => (
              <Link key={d.id} to={`/dossiers/${d.id}`} className="card dossier-card">
                <div className="dossier-card-icon">{TYPE_ICONS[d.type]}</div>
                <div className="dossier-card-info">
                  <h3>{d.titre}</h3>
                  {d.description && <p className="dossier-card-desc">{d.description}</p>}
                  <span className="dossier-card-meta">
                    {VIS_ICONS[d.visibilite]} {TYPE_LABELS[d.type]} · {d.nb_entrees} entrée{d.nb_entrees !== 1 ? 's' : ''} · par {d.created_by_nom}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {dossiers.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '2rem' }}>📁</p>
          <p>Aucun dossier</p>
          <p className="text-muted">Les dossiers personnels se créent automatiquement quand on consulte un effectif.</p>
        </div>
      )}
    </div>
  )
}
