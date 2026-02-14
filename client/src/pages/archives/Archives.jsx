import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import { formatDate } from '../../utils/dates'

const TYPE_CONFIG = {
  rapport: { icon: '📝', label: 'Rapport', color: '#3d5a3e' },
  visite_medicale: { icon: '🏥', label: 'Visite médicale', color: '#2c5f7c' },
  affaire: { icon: '⚖️', label: 'Affaire judiciaire', color: '#5a3d5a' },
  piece: { icon: '📄', label: 'Pièce judiciaire', color: '#6b4a6b' },
  documentation: { icon: '📚', label: 'Documentation', color: '#4a6741' },
}

const ALL_TYPES = Object.keys(TYPE_CONFIG)

export default function Archives() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterAuteur, setFilterAuteur] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/stats/archives', { params: { limit: 100 } })
      .then(r => { setItems(r.data.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    let list = [...items]
    if (filterType !== 'all') list = list.filter(i => i.type === filterType)
    if (filterAuteur) list = list.filter(i => (i.auteur || '').toLowerCase().includes(filterAuteur.toLowerCase()))
    if (search) list = list.filter(i => (i.label || '').toLowerCase().includes(search.toLowerCase()))
    if (filterDateFrom) list = list.filter(i => i.created_at && new Date(i.created_at) >= new Date(filterDateFrom))
    if (filterDateTo) list = list.filter(i => i.created_at && new Date(i.created_at) <= new Date(filterDateTo + 'T23:59:59'))
    setFiltered(list)
  }, [items, filterType, filterAuteur, search, filterDateFrom, filterDateTo])

  const goTo = (item) => {
    const routes = {
      rapport: `/rapports/${item.doc_id}`,
      telegramme: '/telegrammes',
      visite_medicale: `/medical/${item.doc_id}`,
      interdit_front: '/interdits',
      affaire: `/sanctions/${item.doc_id}`,
      piece: `/pieces/${item.doc_id}`,
      documentation: '/documentation',
      pds_recap: '/pds',
    }
    navigate(routes[item.type] || '/')
  }

  const auteurs = [...new Set(items.map(i => i.auteur).filter(Boolean))].sort()

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton label="← Tableau de bord" />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{filtered.length} document{filtered.length > 1 ? 's' : ''}</span>
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>📜 Archives Administratives</h1>

      {/* Filtres */}
      <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">🔎 Recherche</label>
            <input type="text" className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Titre, numéro, nom..." />
          </div>
          <div className="form-group" style={{ minWidth: 160 }}>
            <label className="form-label">Type</label>
            <select className="form-input" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">— Tous —</option>
              {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 160 }}>
            <label className="form-label">Auteur</label>
            <select className="form-input" value={filterAuteur} onChange={e => setFilterAuteur(e.target.value)}>
              <option value="">— Tous —</option>
              {auteurs.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 140 }}>
            <label className="form-label">Du</label>
            <input type="date" className="form-input" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ minWidth: 140 }}>
            <label className="form-label">Au</label>
            <input type="date" className="form-input" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
          </div>
        </div>
        {(filterType !== 'all' || filterAuteur || search || filterDateFrom || filterDateTo) && (
          <button className="btn btn-sm btn-secondary" style={{ marginTop: 8 }} onClick={() => { setFilterType('all'); setFilterAuteur(''); setSearch(''); setFilterDateFrom(''); setFilterDateTo('') }}>
            ✕ Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Type badges résumé */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-lg)', justifyContent: 'center' }}>
        {ALL_TYPES.map(t => {
          const count = items.filter(i => i.type === t).length
          if (!count) return null
          return (
            <button key={t} onClick={() => setFilterType(filterType === t ? 'all' : t)}
              style={{ background: filterType === t ? TYPE_CONFIG[t].color : 'transparent', color: filterType === t ? '#fff' : TYPE_CONFIG[t].color, border: `1px solid ${TYPE_CONFIG[t].color}`, borderRadius: 20, padding: '4px 12px', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
              {TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label} <strong>({count})</strong>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="paper-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>Chargement...</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>Aucun document trouvé</p>
        ) : (
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Type</th>
                <th>Document</th>
                <th>Auteur</th>
                <th style={{ width: 130 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const cfg = TYPE_CONFIG[item.type] || { icon: '📄', label: item.type, color: '#666' }
                return (
                  <tr key={`${item.type}-${item.doc_id}-${i}`} onClick={() => goTo(item)} style={{ cursor: 'pointer' }}>
                    <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>{cfg.icon}</td>
                    <td><span style={{ background: cfg.color, color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>{cfg.label}</span></td>
                    <td style={{ fontSize: '0.83rem' }}>{item.label}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.auteur || '—'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(item.date_doc || item.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
