import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'

const TYPE_COLORS = {
  ceremonie: '#8b6914', operation: '#8b4a47', inspection: '#3d5a3e',
  permission: '#2c5f7c', reunion: '#5a3d5a', autre: '#666'
}
const TYPE_ICONS = {
  ceremonie: '🎖️', operation: '⚔️', inspection: '🔍',
  permission: '🏖️', reunion: '📋', autre: '📌'
}

export default function Calendrier() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })
  const [showForm, setShowForm] = useState(false)
  const [unites, setUnites] = useState([])
  const [form, setForm] = useState({ titre: '', description: '', date_debut: '', date_fin: '', type: 'autre', unite_id: '' })
  const [msg, setMsg] = useState('')

  const canCreate = user?.isAdmin || user?.isOfficier || user?.isRecenseur

  useEffect(() => { api.get('/unites').then(r => setUnites(r.data.data || r.data)).catch(() => {}) }, [])
  useEffect(() => { load() }, [month])

  const load = () => api.get('/calendrier', { params: { month } }).then(r => setEvents(r.data.data)).catch(() => {})

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/calendrier', form)
      setShowForm(false); setForm({ titre: '', description: '', date_debut: '', date_fin: '', type: 'autre', unite_id: '' })
      setMsg('✅ Événement ajouté'); setTimeout(() => setMsg(''), 3000); load()
    } catch (err) { setMsg(err.response?.data?.message || 'Erreur') }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cet événement ?')) return
    try { await api.delete(`/calendrier/${id}`); load() } catch { alert('Erreur') }
  }

  // Build calendar grid
  const [year, mon] = month.split('-').map(Number)
  const firstDay = new Date(year, mon - 1, 1).getDay() || 7 // Monday = 1
  const daysInMonth = new Date(year, mon, 0).getDate()
  const days = []
  for (let i = 1; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const getEventsForDay = (d) => events.filter(e => {
    const start = new Date(e.date_debut).getDate()
    const end = e.date_fin ? new Date(e.date_fin).getDate() : start
    return d >= start && d <= end
  })

  const prevMonth = () => {
    const d = new Date(year, mon - 2, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
  }
  const nextMonth = () => {
    const d = new Date(year, mon, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
  }

  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton label="← Tableau de bord" />
        {canCreate && <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>{showForm ? '✕' : '+ Événement'}</button>}
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>📅 Calendrier RP</h1>
      {msg && <div className="alert alert-success">{msg}</div>}

      {showForm && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <form onSubmit={submit}>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 2 }}><label className="form-label">Titre *</label><input className="form-input" value={form.titre} onChange={e => setForm(f=>({...f,titre:e.target.value}))} required /></div>
              <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                {Object.entries(TYPE_ICONS).map(([k,v]) => <option key={k} value={k}>{v} {k}</option>)}
              </select></div>
              <div className="form-group"><label className="form-label">Unité</label><select className="form-input" value={form.unite_id} onChange={e => setForm(f=>({...f,unite_id:e.target.value}))}>
                <option value="">Toutes</option>{unites.map(u => <option key={u.id} value={u.id}>{u.code}. {u.nom}</option>)}
              </select></div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group"><label className="form-label">Début *</label><input type="datetime-local" className="form-input" value={form.date_debut} onChange={e => setForm(f=>({...f,date_debut:e.target.value}))} required /></div>
              <div className="form-group"><label className="form-label">Fin</label><input type="datetime-local" className="form-input" value={form.date_fin} onChange={e => setForm(f=>({...f,date_fin:e.target.value}))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} rows={2} /></div>
            <button type="submit" className="btn btn-primary">📅 Ajouter</button>
          </form>
        </div>
      )}

      {/* Month navigation */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
        <button className="btn btn-secondary btn-sm" onClick={prevMonth}>◀</button>
        <h2 style={{ margin: 0 }}>{monthNames[mon-1]} {year}</h2>
        <button className="btn btn-secondary btn-sm" onClick={nextMonth}>▶</button>
      </div>

      {/* Calendar grid */}
      <div className="paper-card" style={{ padding: 'var(--space-sm)', overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontWeight: 700, padding: '8px 4px', fontSize: '0.75rem', color: 'var(--military-dark)' }}>{d}</div>
          ))}
          {days.map((d, i) => (
            <div key={i} style={{ minHeight: 80, border: '1px solid var(--border-color)', borderRadius: 4, padding: 4, background: d ? '#faf8f2' : 'transparent', fontSize: '0.75rem' }}>
              {d && <>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{d}</div>
                {getEventsForDay(d).map(ev => (
                  <div key={ev.id} style={{ background: TYPE_COLORS[ev.type] || '#666', color: '#fff', borderRadius: 3, padding: '1px 4px', marginBottom: 2, fontSize: '0.65rem', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={`${ev.titre}\n${ev.description || ''}`}
                    onClick={() => canCreate && remove(ev.id)}>
                    {TYPE_ICONS[ev.type]} {ev.titre}
                  </div>
                ))}
              </>}
            </div>
          ))}
        </div>
      </div>

      {/* Event list */}
      {events.length > 0 && (
        <div className="paper-card" style={{ marginTop: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>📋 Événements du mois</h3>
          <table className="table">
            <thead><tr><th></th><th>Événement</th><th>Date</th><th>Unité</th></tr></thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id}>
                  <td>{TYPE_ICONS[ev.type]}</td>
                  <td><strong>{ev.titre}</strong>{ev.description && <><br/><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ev.description}</span></>}</td>
                  <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(ev.date_debut).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{ev.unite_code || 'Toutes'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
