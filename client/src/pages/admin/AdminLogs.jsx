import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'

const ACTION_ICONS = {
  login: '🔑', login_failed: '❌', login_blocked: '🚫',
  create_effectif: '👤', create_rapport: '📋', create_interdit: '🚫',
}

export default function AdminLogs() {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [limit, setLimit] = useState(50)

  useEffect(() => { load() }, [limit])

  const load = async () => {
    try {
      const res = await api.get('/admin/logs', { params: { limit } })
      setLogs(res.data.data || [])
    } catch (err) { console.error(err) }
  }

  if (!user?.isAdmin) return <div className="container"><p>Accès refusé</p></div>

  const formatDate = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <BackButton label="← Retour" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>📊 Journal d'activité</h1>
        <select className="form-input" style={{ width: 'auto' }} value={limit} onChange={e => setLimit(Number(e.target.value))}>
          <option value={25}>25 dernières</option>
          <option value={50}>50 dernières</option>
          <option value={100}>100 dernières</option>
          <option value={200}>200 dernières</option>
        </select>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Action</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Utilisateur</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Détails</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', background: log.action.includes('failed') || log.action.includes('blocked') ? 'rgba(200,50,50,0.05)' : 'transparent' }}>
                <td style={{ padding: '0.4rem 0.5rem', whiteSpace: 'nowrap' }}>{formatDate(log.created_at)}</td>
                <td style={{ padding: '0.4rem 0.5rem' }}>
                  {ACTION_ICONS[log.action] || '📌'} {log.action}
                </td>
                <td style={{ padding: '0.4rem 0.5rem' }}>{log.username || '—'}</td>
                <td style={{ padding: '0.4rem 0.5rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.details || '—'}</td>
                <td style={{ padding: '0.4rem 0.5rem', color: 'var(--text-muted)' }}>{log.ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Aucune activité enregistrée</p>}
      </div>
    </div>
  )
}
