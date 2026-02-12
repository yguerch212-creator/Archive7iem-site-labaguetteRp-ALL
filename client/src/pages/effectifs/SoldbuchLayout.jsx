import React from 'react'
import { useParams, Link } from 'react-router-dom'
import Topbar from '../../components/layout/Topbar'

export default function SoldbuchLayout() {
  const { id } = useParams()
  
  // TODO: Full InteractJS layout editor (Phase 2)
  return (
    <>
      <Topbar />
      <div className="container" style={{ maxWidth: 1000, marginTop: 'var(--space-xl)' }}>
        <Link to={`/effectifs/${id}/soldbuch`} className="btn btn-secondary btn-small">← Retour au Soldbuch</Link>
        <div className="paper-card" style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
          <h2>🖋️ Éditeur de mise en page</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            L'éditeur drag & drop sera disponible dans la prochaine mise à jour.
          </p>
        </div>
      </div>
    </>
  )
}
