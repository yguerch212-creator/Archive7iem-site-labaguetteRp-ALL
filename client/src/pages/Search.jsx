import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import Topbar from '../components/layout/Topbar'

export default function Search() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    try {
      const r = await apiClient.get(`/search?q=${encodeURIComponent(query)}&filter=${filter}`)
      setResults(r.data.data)
    } catch { setResults({ effectifs: [], rapports: [] }) }
    setLoading(false)
  }

  return (
    <>
      <Topbar />
      <div className="container" style={{ maxWidth: 900, marginTop: 'var(--space-xxl)' }}>
        <h1 style={{ textAlign: 'center' }}>🔎 Recherche</h1>

        <form onSubmit={handleSearch} className="paper-card" style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <input className="form-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un nom, rapport, dossier..." />
          </div>
          <select className="form-select" style={{ maxWidth: 150 }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Tous</option>
            <option value="effectif">Effectifs</option>
            <option value="rapport">Rapports</option>
          </select>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? '...' : '🔍'}
          </button>
        </form>

        {results && (
          <div style={{ marginTop: 'var(--space-lg)' }}>
            {results.effectifs?.length > 0 && (
              <div className="paper-card">
                <h3>📋 Effectifs ({results.effectifs.length})</h3>
                {results.effectifs.map(e => (
                  <div key={e.id} style={{ padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--border-color)' }}>
                    <Link to={`/effectifs/${e.id}/soldbuch`}><strong>{e.prenom} {e.nom}</strong></Link>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{e.grade_nom} — {e.unite_nom}</span>
                  </div>
                ))}
              </div>
            )}

            {results.rapports?.length > 0 && (
              <div className="paper-card">
                <h3>📝 Rapports ({results.rapports.length})</h3>
                {results.rapports.map(r => (
                  <div key={r.id} style={{ padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--border-color)' }}>
                    <Link to={`/rapports/${r.id}`}><strong>{r.titre}</strong></Link>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{r.auteur_nom} — {r.date_irl}</span>
                  </div>
                ))}
              </div>
            )}

            {(!results.effectifs?.length && !results.rapports?.length) && (
              <div className="paper-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucun résultat</div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
