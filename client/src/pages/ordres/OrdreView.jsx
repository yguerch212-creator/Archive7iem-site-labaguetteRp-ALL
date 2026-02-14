import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import { exportToPdf } from '../../utils/exportPdf'

const TYPE_LABELS = { ordre_du_jour: 'ORDRE DU JOUR', ordre_de_mission: 'ORDRE DE MISSION', directive: 'DIRECTIVE', communique: 'COMMUNIQUÉ' }

export default function OrdreView() {
  const { id } = useParams()
  const { user } = useAuth()
  const [ordre, setOrdre] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [id])
  const load = () => api.get(`/ordres/${id}`).then(r => setOrdre(r.data)).catch(() => {})

  const accuser = async () => {
    try {
      await api.post(`/ordres/${id}/accuse`)
      setMsg('✅ Prise de connaissance enregistrée')
      setTimeout(() => setMsg(''), 3000); load()
    } catch (err) { setMsg(err.response?.data?.message || 'Erreur') }
  }

  if (!ordre) return <div className="container"><p style={{ textAlign: 'center', padding: 40 }}>Chargement...</p></div>

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton />
        <button className="btn btn-secondary btn-small" onClick={() => exportToPdf('ordre-doc', `Ordre_${ordre.numero}`)}>📥 PDF</button>
        <ShareButton />
      </div>
      {msg && <div className="alert alert-success">{msg}</div>}

      {/* Document */}
      <div id="ordre-doc" style={{ background: '#f5f2e8', border: '1px solid #c4b99a', borderRadius: 4, padding: '60px 70px', maxWidth: 820, margin: '0 auto', fontFamily: "'IBM Plex Mono', monospace", position: 'relative', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-30deg)', fontSize: '5rem', opacity: 0.03, fontWeight: 900, pointerEvents: 'none' }}>7. ARMEEKORPS</div>
        <div style={{ textAlign: 'center', marginBottom: 40, borderBottom: '2px solid #3d5a3e', paddingBottom: 20 }}>
          <div style={{ fontSize: '0.75rem', color: '#666', letterSpacing: 3, marginBottom: 8 }}>COMMANDEMENT DU 7. ARMEEKORPS</div>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.5rem', letterSpacing: 2, color: '#3d5a3e' }}>{TYPE_LABELS[ordre.type] || ordre.type}</h1>
          <div style={{ fontSize: '1rem', fontWeight: 600 }}>{ordre.numero}</div>
          {ordre.unite_nom && <div style={{ fontSize: '0.85rem', color: '#555', marginTop: 8 }}>Destinataire : {ordre.unite_code}. {ordre.unite_nom}</div>}
        </div>
        <h2 style={{ textAlign: 'center', margin: '0 0 30px', fontSize: '1.1rem' }}>{ordre.titre}</h2>
        <div style={{ fontSize: '0.88rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', minHeight: 200 }}>{ordre.contenu}</div>
        <div style={{ borderTop: '1px solid #999', marginTop: 40, paddingTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{ordre.emis_par_grade} {ordre.emis_par_nom}</div>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>{ordre.date_rp || ''}</div>
          </div>
        </div>
      </div>

      {/* Accuse de reception */}
      <div className="paper-card" style={{ marginTop: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>✅ Accusés de réception ({ordre.accuses?.length || 0})</h3>
          {user?.effectif_id && !ordre.acknowledged && (
            <button className="btn btn-primary btn-small" onClick={accuser}>✅ Prendre connaissance</button>
          )}
          {ordre.acknowledged && <span style={{ color: 'var(--success)', fontWeight: 700 }}>✅ Vous avez pris connaissance</span>}
        </div>
        {ordre.accuses?.length > 0 && (
          <table className="table" style={{ marginTop: 'var(--space-sm)' }}>
            <thead><tr><th>Effectif</th><th>Grade</th><th>Date</th></tr></thead>
            <tbody>
              {ordre.accuses.map(a => (
                <tr key={a.id}>
                  <td>{a.prenom} {a.nom}</td>
                  <td>{a.grade_nom || '—'}</td>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(a.lu_at).toLocaleString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
