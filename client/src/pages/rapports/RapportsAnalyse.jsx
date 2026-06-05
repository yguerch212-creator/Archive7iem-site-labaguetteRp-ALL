import { useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'

export default function RapportsAnalyse() {
  const { user } = useAuth()
  const [analyse, setAnalyse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [periode, setPeriode] = useState('semaine')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [includeFront, setIncludeFront] = useState(true)

  const runAnalyse = () => {
    setLoading(true); setError(null); setAnalyse(null)
    const body = { periode, include_front: includeFront }
    if (periode === 'custom') { body.date_debut = dateDebut; body.date_fin = dateFin }
    api.post('/rapports/analyse-ia', body)
      .then(r => {
        if (r.data.success) setAnalyse(r.data.data)
        else setError(r.data.message || 'Erreur')
        setLoading(false)
      })
      .catch(err => { setError(err.response?.data?.message || 'Erreur réseau'); setLoading(false) })
  }

  if (!user?.isAdmin && !user?.isOfficier) {
    return <div className="container"><p>Accès réservé aux officiers et administrateurs.</p></div>
  }

  const renderAnalyse = (text) => {
    if (!text) return null
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: '1.05rem', marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem' }}>{line.replace('## ', '')}</h2>
      if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: '0.95rem', marginTop: '1rem', marginBottom: '0.3rem' }}>{line.replace('### ', '')}</h3>
      if (line.startsWith('- ')) return <div key={i} style={{ paddingLeft: '1rem', marginBottom: '0.2rem', fontSize: '0.85rem' }}>• {renderBold(line.slice(2))}</div>
      if (line.trim() === '') return <div key={i} style={{ height: '0.5rem' }} />
      return <p key={i} style={{ fontSize: '0.85rem', marginBottom: '0.3rem', lineHeight: 1.5 }}>{renderBold(line)}</p>
    })
  }

  const renderBold = (text) => {
    const parts = text.split(/\*\*(.*?)\*\*/g)
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)
  }

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <BackButton label="← Rapports" />
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>🧠 Analyse IA des Rapports</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
        Analyse du contenu des rapports par intelligence artificielle — chronologie, personnes, corrélations
      </p>

      <div className="paper-card" style={{ padding: '1rem', marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
          <select className="form-input" style={{ maxWidth: 200 }} value={periode} onChange={e => setPeriode(e.target.value)}>
            <option value="semaine">Semaine RP en cours</option>
            <option value="mois">Mois en cours</option>
            <option value="custom">Période personnalisée</option>
          </select>
          {periode === 'custom' && (
            <>
              <input type="date" className="form-input" style={{ maxWidth: 160 }} value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
              <span style={{ color: 'var(--text-muted)' }}>→</span>
              <input type="date" className="form-input" style={{ maxWidth: 160 }} value={dateFin} onChange={e => setDateFin(e.target.value)} />
            </>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={includeFront} onChange={e => setIncludeFront(e.target.checked)} />
            Inclure front + PDS
          </label>
          <button className="btn btn-primary" onClick={runAnalyse} disabled={loading}>
            {loading ? '⏳ Analyse en cours...' : '🧠 Lancer l\'analyse'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 8, padding: '0.8rem 1rem', marginBottom: 'var(--space-lg)', fontSize: '0.85rem', color: '#f44336' }}>
          ❌ {error}
        </div>
      )}

      {loading && (
        <div className="paper-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧠</div>
          <p style={{ color: 'var(--text-muted)' }}>L'IA analyse le contenu des rapports...</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cela peut prendre 10-30 secondes</p>
        </div>
      )}

      {analyse && (
        <div className="paper-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {analyse.rapports_count} rapport{analyse.rapports_count > 1 ? 's' : ''} analysé{analyse.rapports_count > 1 ? 's' : ''} • {analyse.periode?.debut} → {analyse.periode?.fin}
                {analyse.include_front && ' • Front + PDS inclus'}
              </span>
            </div>
            <button className="btn btn-secondary btn-small" onClick={runAnalyse} disabled={loading}>🔄 Relancer</button>
          </div>
          <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '1rem' }}>
            {renderAnalyse(analyse.analyse)}
          </div>
        </div>
      )}
    </div>
  )
}
