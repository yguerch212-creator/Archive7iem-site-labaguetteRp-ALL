import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../../api/client'

export default function EffectifsList() {
  const { uniteId } = useParams()
  const [effectifs, setEffectifs] = useState([])
  const [unite, setUnite] = useState(null)
  const [grades, setGrades] = useState([])
  const [filters, setFilters] = useState({ nom: '', grade: '' })

  useEffect(() => {
    apiClient.get(`/effectifs?unite_id=${uniteId}`).then(r => setEffectifs(r.data.data || [])).catch(() => {})
    apiClient.get(`/unites/${uniteId}/grades`).then(r => setGrades(r.data.data || [])).catch(() => {})
    apiClient.get('/unites').then(r => {
      const u = (r.data.data || []).find(x => x.id == uniteId)
      setUnite(u)
    }).catch(() => {})
  }, [uniteId])

  const filtered = effectifs.filter(e => {
    if (filters.nom && !`${e.prenom} ${e.nom}`.toLowerCase().includes(filters.nom.toLowerCase())) return false
    if (filters.grade && e.grade_nom !== filters.grade) return false
    return true
  })

  return (
    <>
      
      <div className="container" style={{ }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <Link to="/effectifs" className="btn btn-secondary btn-small">← Retour aux unités</Link>
          <Link to={`/effectifs/new?unite_id=${uniteId}`} className="btn btn-primary btn-small">+ Ajouter</Link>
        </div>

        <h1 style={{ textAlign: 'center' }}>{unite ? `${unite.code}. ${unite.nom}` : 'Effectifs'}</h1>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <input
            className="form-input"
            style={{ maxWidth: 250 }}
            placeholder="Nom / Prénom..."
            value={filters.nom}
            onChange={e => setFilters(f => ({ ...f, nom: e.target.value }))}
          />
          <select
            className="form-select"
            style={{ maxWidth: 200 }}
            value={filters.grade}
            onChange={e => setFilters(f => ({ ...f, grade: e.target.value }))}
          >
            <option value="">— Grade —</option>
            {grades.map(g => <option key={g.id} value={g.nom_complet}>{g.nom_complet}</option>)}
          </select>
        </div>

        {/* Tableau */}
        <div className="paper-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={thStyle}>Prénom / Nom</th>
                <th style={thStyle}>Grade</th>
                <th style={thStyle}>Catégorie</th>
                <th style={thStyle}>Fonction</th>
                <th style={thStyle}>Spécialité</th>
                <th style={thStyle}>Entrée RP</th>
                <th style={thStyle}>Entrée IRL</th>
                <th style={thStyle}>Soldbuch</th>
                <th style={thStyle}>Rapports</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>Aucun effectif</td></tr>
              ) : filtered.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={tdStyle}><strong>{e.prenom} {e.nom}</strong></td>
                  <td style={tdStyle}>{e.grade_nom || '—'}</td>
                  <td style={tdStyle}><span className={`badge ${e.categorie === 'Officier' ? 'badge-warning' : e.categorie === 'Sous-officier' ? 'badge-success' : 'badge-muted'}`}>{e.categorie || e.grade_categorie || '—'}</span></td>
                  <td style={tdStyle}>{e.fonction || '—'}</td>
                  <td style={tdStyle}>{e.specialite || '—'}</td>
                  <td style={tdStyle}>{e.date_entree_ig || '—'}</td>
                  <td style={tdStyle}>{e.date_entree_irl || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <Link to={`/effectifs/${e.id}/soldbuch`}>📘</Link>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <Link to={`/rapports?auteur=${encodeURIComponent(e.prenom + ' ' + e.nom)}`}>✏️</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

const thStyle = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)' }
const tdStyle = { padding: 'var(--space-sm) var(--space-md)' }
