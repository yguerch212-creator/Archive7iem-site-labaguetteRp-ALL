import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import apiClient from '../../api/client'
import { useAuth } from '../../auth/useAuth'

const TYPE_LABELS = { rapport: 'Rapport', recommandation: 'Recommandation', incident: 'Incident' }
const TYPE_CLASSES = { rapport: 'type-rapport', recommandation: 'type-recommandation', incident: 'type-incident' }

export default function RapportsList() {
  const [rapports, setRapports] = useState([])
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [filters, setFilters] = useState({
    titre: '', auteur: searchParams.get('auteur') || '', type: ''
  })

  useEffect(() => {
    apiClient.get('/rapports').then(r => setRapports(r.data.data || [])).catch(() => {})
  }, [])

  const filtered = rapports.filter(r => {
    if (filters.titre && !r.titre.toLowerCase().includes(filters.titre.toLowerCase())) return false
    if (filters.auteur && !(r.auteur_nom || '').toLowerCase().includes(filters.auteur.toLowerCase())) return false
    if (filters.type && r.type !== filters.type) return false
    return true
  })

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce rapport ?')) return
    try {
      await apiClient.delete(`/rapports/${id}`)
      setRapports(r => r.filter(x => x.id !== id))
    } catch (err) { alert('Erreur') }
  }

  return (
    <>
      
      <div className="container" style={{ }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
          <Link to="/dashboard" className="btn btn-secondary btn-small">← Retour</Link>
          <Link to="/rapports/new" className="btn btn-primary btn-small">+ Nouveau rapport</Link>
        </div>

        <h1 style={{ textAlign: 'center' }}>📜 Rapports</h1>

        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <input className="form-input" style={{ maxWidth: 200 }} placeholder="Titre..." value={filters.titre} onChange={e => setFilters(f => ({ ...f, titre: e.target.value }))} />
          <input className="form-input" style={{ maxWidth: 200 }} placeholder="Auteur..." value={filters.auteur} onChange={e => setFilters(f => ({ ...f, auteur: e.target.value }))} />
          <select className="form-select" style={{ maxWidth: 180 }} value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
            <option value="">— Type —</option>
            <option value="rapport">Rapport journalier</option>
            <option value="recommandation">Recommandation</option>
            <option value="incident">Incident</option>
          </select>
        </div>

        <div className="paper-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={th}>Titre</th>
                <th style={th}>Date RP</th>
                <th style={th}>Date IRL</th>
                <th style={th}>Auteur</th>
                <th style={th}>Personne mentionnée</th>
                <th style={th}>Type</th>
                <th style={th}>État</th>
                {user?.isAdmin && <th style={th}>🗑️</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>Aucun rapport</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => window.location.href = `/rapports/${r.id}`}>
                  <td style={td}>{r.titre}</td>
                  <td style={td}>{r.date_rp || '—'}</td>
                  <td style={td}>{r.date_irl || '—'}</td>
                  <td style={td}>{r.auteur_nom || 'Inconnu'}</td>
                  <td style={td}>{r.personne_mentionnee || '—'}</td>
                  <td style={td}><span className={`tag ${TYPE_CLASSES[r.type]}`}>{TYPE_LABELS[r.type]}</span></td>
                  <td style={td}>{r.published ? '✅ Publié' : '📝 Brouillon'}</td>
                  {user?.isAdmin && (
                    <td style={td} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-danger btn-small" onClick={() => handleDelete(r.id)}>✖</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

const th = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700 }
const td = { padding: 'var(--space-sm) var(--space-md)' }
