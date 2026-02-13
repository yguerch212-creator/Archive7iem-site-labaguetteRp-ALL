import BackButton from '../components/BackButton'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'

const CAT_ICONS = { Reglement: '📜', Procedure: '📋', Formation: '🎓', Lore: '📖', Outil: '🔧', Autre: '📁' }

export default function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const search = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    try {
      const { data } = await apiClient.get('/search', { params: { q: query, filter } })
      if (data.success) setResults(data.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const typeLabels = { rapport: '📋 Rapport', recommandation: '⭐ Recommandation', incident: '⚠️ Incident' }
  const fmtDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('fr-FR') : '—'

  const totalResults = results ? (results.effectifs?.length || 0) + (results.rapports?.length || 0) + (results.documentation?.length || 0) : 0

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <BackButton label="← Tableau de bord" />
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>🔍 Recherche dans les Archives</h1>

      <form onSubmit={search} className="paper-card" style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">Rechercher</label>
            <input type="text" className="form-input" placeholder="Nom, titre, document..." value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="form-label">Filtrer</label>
            <select className="form-input" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">Tout</option>
              <option value="effectif">Effectifs</option>
              <option value="rapport">Rapports</option>
              <option value="documentation">Documentation</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Recherche...' : 'Rechercher'}</button>
        </div>
      </form>

      {results && (
        <>
          {/* Effectifs */}
          {(filter === 'all' || filter === 'effectif') && results.effectifs?.length > 0 && (
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <h2 style={{ marginBottom: 'var(--space-sm)' }}>👤 Effectifs ({results.effectifs.length})</h2>
              <div className="paper-card" style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={th}>Grade</th><th style={th}>Nom</th><th style={th}>Prénom</th><th style={th}>Unité</th><th style={th}></th>
                  </tr></thead>
                  <tbody>
                    {results.effectifs.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/effectifs/${e.id}/soldbuch`)}>
                        <td style={td}>{e.grade_nom || '—'}</td>
                        <td style={td}><strong>{e.nom}</strong></td>
                        <td style={td}>{e.prenom}</td>
                        <td style={td}>{e.unite_nom || '—'}</td>
                        <td style={td}><span style={{ fontSize: '0.8rem' }}>📘 Soldbuch</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rapports */}
          {(filter === 'all' || filter === 'rapport') && results.rapports?.length > 0 && (
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <h2 style={{ marginBottom: 'var(--space-sm)' }}>📋 Rapports ({results.rapports.length})</h2>
              <div className="paper-card" style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={th}>Type</th><th style={th}>Titre</th><th style={th}>Auteur</th><th style={th}>Date</th>
                  </tr></thead>
                  <tbody>
                    {results.rapports.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/rapports/${r.id}`)}>
                        <td style={td}>{typeLabels[r.type] || r.type}</td>
                        <td style={td}><strong>{r.titre}</strong></td>
                        <td style={td}>{r.auteur_nom || '—'}</td>
                        <td style={td}>{fmtDate(r.date_irl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Documentation */}
          {(filter === 'all' || filter === 'documentation') && results.documentation?.length > 0 && (
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <h2 style={{ marginBottom: 'var(--space-sm)' }}>📚 Documentation ({results.documentation.length})</h2>
              <div className="paper-card">
                {results.documentation.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-sm) var(--space-md)', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '1.1rem' }}>{d.is_repertoire ? '📂' : (CAT_ICONS[d.categorie] || '📄')}</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '0.9rem' }}>{d.titre}</strong>
                      {d.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.description}</div>}
                    </div>
                    {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary" style={{ padding: '4px 12px', fontSize: '0.75rem', textDecoration: 'none' }}>🔗 Ouvrir</a>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalResults === 0 && (
            <div className="paper-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>Aucun résultat pour « {query} »</p>
            </div>
          )}
        </>
      )}

      {!results && (
        <div className="paper-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏛️</p>
          <p style={{ color: 'var(--text-muted)' }}>Entrez un terme pour fouiller les archives.</p>
        </div>
      )}
    </div>
  )
}

const th = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)' }
const td = { padding: 'var(--space-sm) var(--space-md)' }
