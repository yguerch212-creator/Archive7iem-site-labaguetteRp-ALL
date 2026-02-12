import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'

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
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const typeLabels = { rapport: '📋 Rapport', recommandation: '⭐ Recommandation', incident: '⚠️ Incident' }

  return (
    <div className="page-container">
      <h1 className="page-title">🔍 Recherche dans les Archives</h1>

      <form onSubmit={search} className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label">Rechercher</label>
            <input
              type="text"
              className="form-input"
              placeholder="Nom, prénom, titre de rapport..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="form-label">Filtrer</label>
            <select className="form-input" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">Tout</option>
              <option value="effectif">Effectifs</option>
              <option value="rapport">Rapports</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>
      </form>

      {results && (
        <div>
          {(filter === 'all' || filter === 'effectif') && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 className="section-title">👤 Effectifs ({results.effectifs.length})</h2>
              {results.effectifs.length === 0 ? (
                <p className="text-muted">Aucun effectif trouvé.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr><th>Grade</th><th>Nom</th><th>Prénom</th><th>Unité</th><th></th></tr>
                    </thead>
                    <tbody>
                      {results.effectifs.map(e => (
                        <tr key={e.id}>
                          <td>{e.grade_nom || '—'}</td>
                          <td><strong>{e.nom}</strong></td>
                          <td>{e.prenom}</td>
                          <td>{e.unite_nom || '—'}</td>
                          <td>
                            <button className="btn btn-sm" onClick={() => navigate(`/effectifs/soldbuch/${e.id}`)}>
                              📖 Soldbuch
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {(filter === 'all' || filter === 'rapport') && (
            <div>
              <h2 className="section-title">📋 Rapports ({results.rapports.length})</h2>
              {results.rapports.length === 0 ? (
                <p className="text-muted">Aucun rapport trouvé.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr><th>Type</th><th>Titre</th><th>Auteur</th><th>Date</th><th></th></tr>
                    </thead>
                    <tbody>
                      {results.rapports.map(r => (
                        <tr key={r.id}>
                          <td>{typeLabels[r.type] || r.type}</td>
                          <td><strong>{r.titre}</strong></td>
                          <td>{r.auteur_nom || '—'}</td>
                          <td>{r.date_irl || '—'}</td>
                          <td>
                            <button className="btn btn-sm" onClick={() => navigate(`/rapports/${r.id}`)}>
                              👁️ Voir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {results.effectifs.length === 0 && results.rapports.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p className="text-muted">Aucun résultat pour « {query} »</p>
            </div>
          )}
        </div>
      )}

      {!results && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏛️</p>
          <p className="text-muted">Entrez un terme de recherche pour fouiller les archives.</p>
        </div>
      )}
    </div>
  )
}
