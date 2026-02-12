import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../api/client'
import Topbar from '../../components/layout/Topbar'

const UNIT_COLORS = {
  '916': '#dcdcdc', '254': '#ff9500', '916S': '#3da9fc',
  '001': '#222', '919': '#8B4513', '130': '#8a2be2', '009': '#e4c21c'
}

export default function UnitesList() {
  const [unites, setUnites] = useState([])

  useEffect(() => {
    apiClient.get('/unites').then(r => setUnites(r.data.data || [])).catch(() => {})
  }, [])

  return (
    <>
      <Topbar />
      <div className="container" style={{ marginTop: 'var(--space-xxl)', maxWidth: 800 }}>
        <Link to="/dashboard" className="btn btn-secondary btn-small" style={{ marginBottom: 'var(--space-lg)' }}>← Retour</Link>
        <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-xs)' }}>Effectifs</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 'var(--space-xl)' }}>
          Sélectionnez une unité pour afficher les effectifs
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {unites.map(u => (
            <Link
              key={u.id}
              to={`/effectifs/unite/${u.id}`}
              className="paper-card"
              style={{
                textDecoration: 'none',
                borderLeft: `5px solid ${UNIT_COLORS[u.code] || '#888'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-lg)',
                marginBottom: 0
              }}
            >
              <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                {u.code}. {u.nom}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>→</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
