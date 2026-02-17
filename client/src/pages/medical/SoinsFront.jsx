import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'

const TYPES_SOIN = ['Soin au front', 'Stabilisation', 'Evacuation', 'Premiers secours', 'Bandage', 'Injection', 'Chirurgie de terrain', 'Autre']

export default function SoinsFront() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [message, setMessage] = useState(null)
  const [patientText, setPatientText] = useState('')
  const [patientId, setPatientId] = useState(null)
  const [typeSoin, setTypeSoin] = useState('Soin au front')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [todayCount, setTodayCount] = useState(0)

  const canLog = user?.unite_code === '916S' || user?.isAdmin || user?.isRecenseur

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const params = {}
      if (user?.effectif_id && user?.unite_code === '916S') params.medecin_id = user.effectif_id
      const res = await api.get('/medical-soldbuch/soins', { params })
      const data = res.data.data || []
      setItems(data)
      // Count today's soins
      const today = new Date().toISOString().slice(0, 10)
      setTodayCount(data.filter(s => s.date_soin?.startsWith(today)).length)
    } catch {}
  }

  const quickLog = async () => {
    setSaving(true)
    try {
      await api.post('/medical-soldbuch/soins', {
        patient_id: patientId || null,
        patient_nom_libre: patientId ? null : (patientText || null),
        type_soin: typeSoin,
        notes: notes || null
      })
      setPatientText('')
      setPatientId(null)
      setNotes('')
      setMessage({ type: 'success', text: '✓ Soin enregistré !' })
      setTimeout(() => setMessage(null), 2000)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
    setSaving(false)
  }

  const fmt = (d) => {
    if (!d) return '—'
    try {
      const dt = new Date(d)
      return dt.toLocaleDateString('fr-FR') + ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    } catch { return d }
  }

  return (
    <div className="container">
      <BackButton label="← Service médical" to="/medical" />
      <h1 style={{ textAlign: 'center', margin: 'var(--space-lg) 0' }}>⚕️ Soins au front</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)', fontSize: '0.85rem' }}>
        Enregistrement rapide des soins effectués — Date & heure automatiques
      </p>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {/* Quick counter */}
      <div className="paper-card" style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
        <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--military-green)' }}>{todayCount}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>soins aujourd'hui</div>
      </div>

      {/* Quick log form */}
      {canLog && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>⚡ Enregistrer un soin</h3>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
              <label className="form-label">Patient (optionnel)</label>
              <EffectifAutocomplete
                value={patientText}
                onChange={(text, eff) => { setPatientText(text); setPatientId(eff?.id || null) }}
                onSelect={eff => { setPatientId(eff.id); setPatientText(`${eff.prenom} ${eff.nom}`) }}
                placeholder="Nom du patient ou laisser vide..."
              />
              {patientText && !patientId && <p style={{ fontSize: '0.7rem', color: 'var(--warning)', margin: '2px 0 0' }}>⚠️ Sera lié si créé plus tard</p>}
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
              <label className="form-label">Type de soin</label>
              <select className="form-input" value={typeSoin} onChange={e => setTypeSoin(e.target.value)}>
                {TYPES_SOIN.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
              <label className="form-label">Notes rapides</label>
              <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optionnel..." />
            </div>
            <button className="btn btn-primary" onClick={quickLog} disabled={saving} style={{ height: 42, whiteSpace: 'nowrap' }}>
              {saving ? '⏳' : '⚕️ +1 Soin'}
            </button>
          </div>
        </div>
      )}

      {/* Log table */}
      <div className="paper-card">
        <h3 style={{ marginTop: 0 }}>Historique des soins</h3>
        <table className="table">
          <thead><tr><th>Date/Heure</th><th>Médecin</th><th>Patient</th><th>Type</th><th>Notes</th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucun soin enregistré</td></tr> :
              items.slice(0, 100).map(s => (
                <tr key={s.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{fmt(s.date_soin)}</td>
                  <td>{s.medecin_nom || '—'}</td>
                  <td>{s.patient_nom || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Anonyme</span>}</td>
                  <td>{s.type_soin}</td>
                  <td style={{ fontSize: '0.8rem' }}>{s.notes || '—'}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
