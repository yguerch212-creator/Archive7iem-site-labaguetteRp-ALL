import BackButton from '../components/BackButton'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'

const CAT_ICONS = { Reglement: '📜', Procedure: '📋', Formation: '🎓', Lore: '📖', Outil: '🔧', Autre: '📁' }

export default function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedEffectif, setSelectedEffectif] = useState(null)
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

  const totalResults = results ? (results.effectifs?.length || 0) + (results.rapports?.length || 0) + (results.documentation?.length || 0) + (results.telegrammes?.length || 0) + (results.pieces?.length || 0) : 0

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <BackButton label="← Tableau de bord" />
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>🔍 Recherche dans les Archives</h1>

      <form onSubmit={search} className="paper-card" style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'end', width: '100%' }}>
          <div style={{ flex: '1 1 100%', minWidth: 0 }}>
            <label className="form-label">Rechercher</label>
            <input type="text" className="form-input" placeholder="Nom, titre, document..." value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <label className="form-label">Filtrer</label>
            <select className="form-input" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">Tout</option>
              <option value="effectif">Effectifs</option>
              <option value="rapport">Rapports</option>
              <option value="documentation">Documentation</option>
              <option value="telegramme">Télégrammes</option>
              <option value="piece">Pièces judiciaires</option>
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
                      <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => setSelectedEffectif(e)}>
                        <td style={td}>{e.grade_nom || '—'}</td>
                        <td style={td}><strong>{e.nom}</strong></td>
                        <td style={td}>{e.prenom}</td>
                        <td style={td}>{e.unite_nom || '—'}</td>
                        <td style={td}><span style={{ fontSize: '0.8rem' }}>👆</span></td>
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

          {/* Télégrammes */}
          {(filter === 'all' || filter === 'telegramme') && results.telegrammes?.length > 0 && (
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <h2 style={{ marginBottom: 'var(--space-sm)' }}>⚡ Télégrammes ({results.telegrammes.length})</h2>
              <div className="paper-card" style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={th}>Numéro</th><th style={th}>Objet</th><th style={th}>Expéditeur</th><th style={th}>Destinataire</th>
                  </tr></thead>
                  <tbody>
                    {results.telegrammes.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/telegrammes`)}>
                        <td style={td}><strong>{t.numero}</strong></td>
                        <td style={td}>{t.objet}</td>
                        <td style={td}>{t.expediteur_nom || '—'}</td>
                        <td style={td}>{t.destinataire_nom || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pièces judiciaires */}
          {(filter === 'all' || filter === 'piece') && results.pieces?.length > 0 && (
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <h2 style={{ marginBottom: 'var(--space-sm)' }}>⚖️ Pièces judiciaires ({results.pieces.length})</h2>
              <div className="paper-card" style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={th}>Affaire</th><th style={th}>Titre</th><th style={th}>Type</th><th style={th}>Rédigé par</th>
                  </tr></thead>
                  <tbody>
                    {results.pieces.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/pieces/${p.id}`)}>
                        <td style={td}>{p.affaire_numero || '—'}</td>
                        <td style={td}><strong>{p.titre}</strong></td>
                        <td style={td}>{p.type}</td>
                        <td style={td}>{p.redige_par_nom || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

      {/* Popup effectif (même que EffectifsList) */}
      {selectedEffectif && (
        <div className="popup-overlay" onClick={() => setSelectedEffectif(null)}>
          <div className="popup-content" style={{ maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setSelectedEffectif(null)}>✕</button>
            <h3 style={{ marginBottom: '0.3rem' }}>{selectedEffectif.prenom} {selectedEffectif.nom}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.2rem' }}>
              {selectedEffectif.grade_nom || '—'} — {selectedEffectif.unite_nom || '—'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button className="btn btn-primary" onClick={() => navigate(`/effectifs/${selectedEffectif.id}/soldbuch`)}>📘 Soldbuch</button>
              <button className="btn btn-secondary" onClick={() => navigate(`/dossiers/effectif/${selectedEffectif.id}`)}>📁 Dossier</button>
              <button className="btn btn-secondary" onClick={() => navigate(`/medical?effectif=${selectedEffectif.id}`)}>🏥 Dossier médical</button>
              <button className="btn btn-secondary" onClick={() => navigate(`/effectifs/${selectedEffectif.id}/edit`)}>✏️ Modifier</button>
              <button className="btn" onClick={() => { setQuery(`${selectedEffectif.prenom} ${selectedEffectif.nom}`); setSelectedEffectif(null) }}>🔎 Rechercher dans les archives</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const th = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)' }
const td = { padding: 'var(--space-sm) var(--space-md)' }
