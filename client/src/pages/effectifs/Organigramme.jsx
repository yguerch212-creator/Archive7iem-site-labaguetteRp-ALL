import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import BackButton from '../../components/BackButton'

export default function Organigramme() {
  const [unites, setUnites] = useState([])
  const [effectifs, setEffectifs] = useState({})
  const [loading, setLoading] = useState(true)
  const [expandedUnite, setExpandedUnite] = useState(null)

  useEffect(() => {
    api.get('/unites').then(async (r) => {
      const units = r.data.data || r.data
      setUnites(units)
      // Load effectifs per unit
      const effs = {}
      for (const u of units) {
        try {
          const res = await api.get(`/effectifs?unite_id=${u.id}`)
          effs[u.id] = res.data.data || []
        } catch { effs[u.id] = [] }
      }
      setEffectifs(effs)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="container"><p style={{ textAlign: 'center', padding: 40 }}>Chargement de l'organigramme...</p></div>

  const categorize = (list) => {
    const off = list.filter(e => (e.grade_rang || 0) >= 60).sort((a, b) => (b.grade_rang || 0) - (a.grade_rang || 0))
    const so = list.filter(e => (e.grade_rang || 0) >= 35 && (e.grade_rang || 0) < 60).sort((a, b) => (b.grade_rang || 0) - (a.grade_rang || 0))
    const hdr = list.filter(e => (e.grade_rang || 0) < 35).sort((a, b) => (b.grade_rang || 0) - (a.grade_rang || 0))
    return { off, so, hdr }
  }

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton label="← Tableau de bord" />
      </div>
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>🗺️ Organigramme — 7. Armeekorps</h1>

      {/* Top level: Commandement */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
        <div className="paper-card" style={{ display: 'inline-block', padding: 'var(--space-md) var(--space-xl)', borderTop: '4px solid #3d5a3e' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>7. Armeekorps</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Commandement</div>
        </div>
      </div>

      {/* Units tree */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
        {unites.map(u => {
          const list = effectifs[u.id] || []
          const { off, so, hdr } = categorize(list)
          const expanded = expandedUnite === u.id

          return (
            <div key={u.id} className="paper-card" style={{ borderTop: `4px solid ${u.couleur || '#3d5a3e'}` }}>
              <div style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setExpandedUnite(expanded ? null : u.id)}>
                <div>
                  <h3 style={{ margin: 0 }}>{u.code}. {u.nom}</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{list.length} effectifs</span>
                </div>
                <span style={{ fontSize: '1.2rem' }}>{expanded ? '▼' : '▶'}</span>
              </div>

              {expanded && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                  {/* Officiers */}
                  {off.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8b6914', letterSpacing: 1, marginBottom: 4 }}>OFFICIERS</div>
                      {off.map(e => <PersonCard key={e.id} e={e} color="#8b6914" />)}
                    </div>
                  )}
                  {/* Sous-officiers */}
                  {so.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3d5a3e', letterSpacing: 1, marginBottom: 4 }}>SOUS-OFFICIERS</div>
                      {so.map(e => <PersonCard key={e.id} e={e} color="#3d5a3e" />)}
                    </div>
                  )}
                  {/* HDR */}
                  {hdr.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#666', letterSpacing: 1, marginBottom: 4 }}>HOMMES DU RANG</div>
                      {hdr.map(e => <PersonCard key={e.id} e={e} color="#666" />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PersonCard({ e, color }) {
  return (
    <Link to={`/effectifs/${e.unite_id}/${e.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderLeft: `3px solid ${color}`, marginBottom: 4, textDecoration: 'none', color: 'inherit', borderRadius: '0 4px 4px 0', background: 'rgba(0,0,0,0.02)' }}>
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{e.grade_nom || ''} {e.prenom} {e.nom}</div>
        {e.fonction && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{e.fonction}</div>}
      </div>
    </Link>
  )
}
