import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import './front.css'

const EVENT_ICONS = { prise: '🚩', perte: '🏳️', attaque: '🇺🇸', defense: '🇩🇪' }
const EVENT_LABELS = { prise: "Prise de l'avant-poste", perte: "Perte de l'avant-poste", attaque: 'Attaque de base', defense: 'Défense de base' }

export default function SituationFront() {
  const { user } = useAuth()
  const [maps, setMaps] = useState([])
  const [selectedMap, setSelectedMap] = useState(null)
  const [events, setEvents] = useState([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  // Form state
  const [eventType, setEventType] = useState('prise')
  const [vpId, setVpId] = useState('')
  const [winner, setWinner] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canPost = user?.isOfficier || user?.isAdmin || user?.isRecenseur || user?.isEtatMajor || user?.isSousOfficier

  useEffect(() => {
    api.get('/front/maps').then(r => setMaps(r.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedMap) loadEvents()
  }, [selectedMap, date])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const r = await api.get('/front/events', { params: { map: selectedMap, date } })
      setEvents(r.data.data || [])
    } catch { }
    setLoading(false)
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      const map = maps.find(m => m.id === selectedMap)
      const vp = map?.vps?.find(v => v.id === vpId)
      await api.post('/front/events', {
        map_id: selectedMap,
        event_type: eventType,
        vp_id: vpId || null,
        vp_nom: vp?.nom || null,
        winner: ['attaque', 'defense'].includes(eventType) ? winner : null
      })
      setMsg('✅ Événement enregistré')
      setTimeout(() => setMsg(''), 2000)
      setVpId('')
      setWinner('')
      loadEvents()
    } catch (err) { setMsg('❌ ' + (err.response?.data?.message || 'Erreur')) }
    setSubmitting(false)
  }

  const deleteEvent = async (id) => {
    if (!confirm('Supprimer cet événement ?')) return
    try { await api.delete(`/front/events/${id}`); loadEvents() } catch { }
  }

  const isToday = date === new Date().toISOString().slice(0, 10)
  const map = maps.find(m => m.id === selectedMap)

  // Stats for current day
  const prises = events.filter(e => e.event_type === 'prise').length
  const pertes = events.filter(e => e.event_type === 'perte').length
  const attaques = events.filter(e => e.event_type === 'attaque').length
  const defenses = events.filter(e => e.event_type === 'defense').length
  const vicAll = events.filter(e => e.winner === 'ALL').length
  const vicUs = events.filter(e => e.winner === 'US').length

  return (
    <div className="container">
      <BackButton />
      <h1 style={{ textAlign: 'center' }}>⚔️ Situation du Front</h1>

      {!selectedMap ? (
        <div className="front-maps-grid">
          {maps.map(m => (
            <div key={m.id} className="paper-card front-map-card" onClick={() => setSelectedMap(m.id)}>
              <h3>{m.nom}</h3>
              <p className="text-muted">{m.vps.length} avant-postes{m.specials?.length ? ` · ${m.specials.length} spéciaux` : ''}</p>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedMap(null)}>← Cartes</button>
            <h2 style={{ margin: 0 }}>{map?.nom}</h2>
            <input type="date" className="form-input" style={{ maxWidth: 180 }} value={date} onChange={e => setDate(e.target.value)} />
            {!isToday && <button className="btn btn-sm" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>Aujourd'hui</button>}
          </div>

          {/* Stats chips */}
          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
            <span className="pds-stat-chip">🚩 {prises} prises</span>
            <span className="pds-stat-chip chip-red">🏳️ {pertes} pertes</span>
            {attaques > 0 && <span className="pds-stat-chip">🇺🇸 {attaques} attaques</span>}
            {defenses > 0 && <span className="pds-stat-chip">🇩🇪 {defenses} défenses</span>}
            {vicAll > 0 && <span className="pds-stat-chip chip-green">🏆 ALL: {vicAll}</span>}
            {vicUs > 0 && <span className="pds-stat-chip chip-red">🏆 US: {vicUs}</span>}
          </div>

          {/* New event form — only for SO+ and today */}
          {canPost && isToday && (
            <div className="paper-card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <h4 style={{ margin: '0 0 var(--space-sm)' }}>📝 Nouvel événement</h4>
              {msg && <div className="alert" style={{ marginBottom: 'var(--space-sm)' }}>{msg}</div>}
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '.75rem' }}>Type</label>
                  <select className="form-input" value={eventType} onChange={e => { setEventType(e.target.value); setVpId(''); setWinner('') }}>
                    <option value="prise">🚩 Prise d'avant-poste</option>
                    <option value="perte">🏳️ Perte d'avant-poste</option>
                    {(map?.specials || []).filter(s => s.type === 'attaque').map(s => <option key={s.id} value="attaque">🇺🇸 {s.nom}</option>)}
                    {(map?.specials || []).filter(s => s.type === 'defense').map(s => <option key={s.id} value="defense">🇩🇪 {s.nom}</option>)}
                  </select>
                </div>
                {['prise', 'perte'].includes(eventType) && (
                  <div>
                    <label className="form-label" style={{ fontSize: '.75rem' }}>Avant-poste</label>
                    <select className="form-input" value={vpId} onChange={e => setVpId(e.target.value)}>
                      <option value="">— Choisir —</option>
                      {(map?.vps || []).map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
                    </select>
                  </div>
                )}
                {['attaque', 'defense'].includes(eventType) && (
                  <div>
                    <label className="form-label" style={{ fontSize: '.75rem' }}>Victoire</label>
                    <select className="form-input" value={winner} onChange={e => setWinner(e.target.value)}>
                      <option value="">— Résultat —</option>
                      <option value="ALL">🇩🇪 Allemands</option>
                      <option value="US">🇺🇸 Américains</option>
                    </select>
                  </div>
                )}
                <button className="btn btn-primary btn-sm" onClick={submit} disabled={submitting || (['prise','perte'].includes(eventType) && !vpId) || (['attaque','defense'].includes(eventType) && !winner)}>
                  {submitting ? '...' : '✅ Enregistrer'}
                </button>
              </div>
              <p className="text-muted" style={{ fontSize: '.7rem', marginTop: 'var(--space-xs)' }}>
                Par {user?.grade_nom || ''} {user?.prenom || ''} {user?.nom || ''} — Heure auto (Paris)
              </p>
            </div>
          )}

          {/* Events list */}
          <div className="paper-card" style={{ overflow: 'auto' }}>
            {loading ? <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>Chargement...</p> : events.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>Aucun événement pour cette journée</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Heure</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Événement</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>VP</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Par</th>
                  {(user?.isAdmin || user?.isOfficier) && <th style={{ padding: '8px 12px' }}></th>}
                </tr></thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{e.event_time}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {EVENT_ICONS[e.event_type]} {EVENT_LABELS[e.event_type]}
                        {e.winner && <span className={`badge ${e.winner === 'ALL' ? 'badge-green' : 'badge-red'}`} style={{ marginLeft: 8 }}>Win: {e.winner}</span>}
                      </td>
                      <td style={{ padding: '8px 12px' }}>{e.vp_nom || '—'}</td>
                      <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{e.grade_nom ? `${e.grade_nom} ` : ''}{e.effectif_nom || '—'}</td>
                      {(user?.isAdmin || user?.isOfficier) && <td style={{ padding: '8px 12px' }}>
                        <button className="btn btn-sm" style={{ color: 'var(--danger)', fontSize: '.7rem' }} onClick={() => deleteEvent(e.id)}>🗑️</button>
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
