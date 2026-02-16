import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'
import { formatDate } from '../../utils/dates'
import './sanctions.css'

const TYPES_AFFAIRE = ['Enquete', 'Proces', 'Disciplinaire', 'Administrative']
const STATUTS = ['Ouverte', 'En cours', 'Audience', 'Jugee', 'Classee', 'Appel']
const ROLES = ['Accuse', 'Temoin', 'Victime', 'Enqueteur', 'Juge', 'Defenseur']
const TYPES_PIECE = ['Proces-verbal', 'Temoignage', 'Decision', 'Rapport-infraction', 'Piece-a-conviction', 'Requisitoire', 'Note-interne', 'Autre']

const ROLE_ICONS = { Accuse: '⛓️', Temoin: '👁️', Victime: '🩸', Enqueteur: '🔍', Juge: '⚖️', Defenseur: '🛡️' }
const PIECE_ICONS = { 'Proces-verbal': '📋', 'Temoignage': '🗣️', 'Decision': '⚖️', 'Rapport-infraction': '🚨', 'Piece-a-conviction': '🔗', 'Requisitoire': '📜', 'Note-interne': '🔒', 'Autre': '📄' }
const STATUT_COLORS = { Ouverte: '#b8860b', 'En cours': '#2980b9', Audience: '#8e44ad', Jugee: '#27ae60', Classee: '#7f8c8d', Appel: '#c0392b' }
const GRAVITE_COLORS = { 1: '#6b8f3c', 2: '#b8860b', 3: '#d2691e', 4: '#c0392b', 5: '#7b0000' }

export default function Sanctions() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('affaires')
  const [affaires, setAffaires] = useState([])
  const [infractions, setInfractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)

  const canWrite = user?.isAdmin || user?.isOfficier || user?.isFeldgendarmerie

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, iRes] = await Promise.all([
        api.get('/affaires'),
        api.get('/affaires/ref/infractions')
      ])
      setAffaires(aRes.data?.data || aRes.data || [])
      setInfractions(iRes.data?.data || iRes.data || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = affaires.filter(a => {
    if (filterStatut && a.statut !== filterStatut) return false
    if (filterType && a.type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      if (!a.titre.toLowerCase().includes(q) && !a.numero.toLowerCase().includes(q) && !(a.accuses || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div className="container">
      <BackButton />
      <h1 className="page-title">⚖️ Justice Militaire</h1>
      <p className="page-subtitle">Feldgendarmerie — Tribunal Militaire du 7e Armeekorps</p>

      <div className="sanctions-tabs">
        <button className={tab === 'affaires' ? 'active' : ''} onClick={() => setTab('affaires')}>
          📂 Affaires ({affaires.length})
        </button>
        <button className={tab === 'code' ? 'active' : ''} onClick={() => setTab('code')}>
          📖 Code Pénal
        </button>
        <button className={tab === 'accreditations' ? 'active' : ''} onClick={() => setTab('accreditations')}>
          🏛️ Accréditations
        </button>
      </div>

      {tab === 'affaires' && (
        <div className="paper-card">
          <div className="sanctions-toolbar">
            <input type="text" placeholder="Rechercher (n°, titre, accusé)..." value={search}
              onChange={e => setSearch(e.target.value)} className="form-input" />
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="form-input" style={{width:'auto',minWidth:140}}>
              <option value="">Tous statuts</option>
              {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="form-input" style={{width:'auto',minWidth:140}}>
              <option value="">Tous types</option>
              {TYPES_AFFAIRE.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {canWrite && (
              <button className="btn btn-primary" onClick={() => setShowNewForm(true)}>+ Ouvrir une affaire</button>
            )}
          </div>

          {loading ? <p>Chargement...</p> : filtered.length === 0 ? (
            <p className="empty-state">Aucune affaire enregistrée</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Affaire</th>
                  <th>Type</th>
                  <th>Accusé(s)</th>
                  <th>Gravité</th>
                  <th>Statut</th>
                  <th>Pièces</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="clickable-row" onClick={() => navigate(`/sanctions/${a.id}`)}>
                    <td className="mono">{a.numero}</td>
                    <td><strong>{a.titre}</strong></td>
                    <td>{a.type}</td>
                    <td>{a.accuses || <span className="text-muted">—</span>}</td>
                    <td>
                      <span className="groupe-badge" style={{ background: GRAVITE_COLORS[a.gravite] }}>{a.gravite}</span>
                    </td>
                    <td>
                      <span className="statut-badge" style={{ background: STATUT_COLORS[a.statut] }}>{a.statut}</span>
                    </td>
                    <td className="mono">{a.nb_pieces}</td>
                    <td>{a.date_ouverture_irl ? formatDate(a.date_ouverture_irl) : a.date_ouverture_rp || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'code' && <CodePenal infractions={infractions} />}
      {tab === 'accreditations' && <Accreditations />}

      {showNewForm && (
        <NewAffaireForm onClose={() => setShowNewForm(false)} onCreated={(id) => { setShowNewForm(false); navigate(`/sanctions/${id}`) }} />
      )}
    </div>
  )
}

// ==================== Code Pénal ====================
function CodePenal({ infractions }) {
  const grouped = {}
  infractions.forEach(i => { (grouped[i.groupe] = grouped[i.groupe] || []).push(i) })
  const LABELS = { 1: 'Mineur', 2: 'Intermédiaire', 3: 'Grave', 4: 'Très grave', 5: 'Capital' }

  return (
    <div className="paper-card code-penal">
      <h2>📖 Code de Procédure Pénale Militaire</h2>
      <div className="code-intro">
        <p>Le Guide des infractions régit les lois et la doctrine militaire au sein de l'armée de la Wehrmacht.</p>
        <p><em>Document repris et édité du Général Kris Fuhuerwehrmann</em></p>
      </div>
      {[1,2,3,4,5].map(g => (
        <div key={g} className="groupe-section">
          <h3 style={{ color: GRAVITE_COLORS[g] }}>Groupe {g} — {LABELS[g]}</h3>
          <table className="data-table">
            <thead><tr><th>Infraction</th><th>Description</th><th>Récidive</th></tr></thead>
            <tbody>
              {(grouped[g] || []).map(i => (
                <tr key={i.id}><td><strong>{i.nom}</strong></td><td>{i.description}</td><td>{i.groupe_recidive || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function Accreditations() {
  return (
    <div className="paper-card">
      <h2>🏛️ Accréditations — Feldgendarmerie</h2>
      <table className="data-table">
        <thead><tr><th>Grade</th><th>Niveaux</th><th>Groupes</th></tr></thead>
        <tbody>
          <tr><td><strong>Officiers</strong></td><td>1 à 5</td><td>{[1,2,3,4,5].map(g => <span key={g} className="groupe-badge" style={{background:GRAVITE_COLORS[g]}}>{g}</span>)}</td></tr>
          <tr><td><strong>Sous-Officiers</strong></td><td>1 à 3</td><td>{[1,2,3].map(g => <span key={g} className="groupe-badge" style={{background:GRAVITE_COLORS[g]}}>{g}</span>)}</td></tr>
          <tr><td><strong>Hommes du Rang</strong></td><td>1 à 2</td><td>{[1,2].map(g => <span key={g} className="groupe-badge" style={{background:GRAVITE_COLORS[g]}}>{g}</span>)}</td></tr>
        </tbody>
      </table>
      <div className="accred-note"><p>⚠️ Groupes 3+ : sous réserve de l'autorité du commandant de corps ou adjoint.</p></div>
    </div>
  )
}

// ==================== New Affaire Form ====================
function NewAffaireForm({ onClose, onCreated }) {
  const [form, setForm] = useState({
    titre: '', type: 'Enquete', gravite: 1, resume: '',
    date_ouverture_rp: '', date_ouverture_irl: new Date().toISOString().split('T')[0], lieu: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!form.titre) { setError('Titre requis'); return }
    setSubmitting(true)
    try {
      const res = await api.post('/affaires', form)
      onCreated(res.data.id)
    } catch (err) { setError(err.response?.data?.error || 'Erreur') }
    setSubmitting(false)
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" style={{maxWidth:600}} onClick={e => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>✕</button>
        <h2>📂 Ouvrir une affaire</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group"><label>Intitulé de l'affaire *</label>
            <input className="form-input" value={form.titre} onChange={e => setForm(f => ({...f, titre: e.target.value}))} placeholder="Ex: Enquête sur désertion de Pvt. Müller" /></div>
          <div className="form-row">
            <div className="form-group"><label>Type</label>
              <select className="form-input" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                {TYPES_AFFAIRE.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div className="form-group"><label>Gravité</label>
              <select className="form-input" value={form.gravite} onChange={e => setForm(f => ({...f, gravite: parseInt(e.target.value)}))}>
                {[1,2,3,4,5].map(g => <option key={g} value={g}>Groupe {g}</option>)}
              </select></div>
          </div>
          <div className="form-group"><label>Résumé</label>
            <textarea className="form-input" rows={3} value={form.resume} onChange={e => setForm(f => ({...f, resume: e.target.value}))} placeholder="Contexte de l'affaire..." /></div>
          <div className="form-row">
            <div className="form-group"><label>Date RP</label><input className="form-input" value={form.date_ouverture_rp} onChange={e => setForm(f => ({...f, date_ouverture_rp: e.target.value}))} placeholder="Ex: 12 Juin 1944" /></div>
            <div className="form-group"><label>Date IRL</label><input type="date" className="form-input" value={form.date_ouverture_irl} onChange={e => setForm(f => ({...f, date_ouverture_irl: e.target.value}))} /></div>
            <div className="form-group"><label>Lieu</label><input className="form-input" value={form.lieu} onChange={e => setForm(f => ({...f, lieu: e.target.value}))} placeholder="Lieu..." /></div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? '...' : '📂 Ouvrir l\'affaire'}</button>
            <button type="button" className="btn" onClick={onClose}>Annuler</button>
          </div>
        </form>
      </div>
    </div>
  )
}
