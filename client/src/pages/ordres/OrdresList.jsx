import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import { formatDate } from '../../utils/dates'

const TYPE_LABELS = { ordre_du_jour: 'Ordre du jour', ordre_de_mission: 'Ordre de mission', directive: 'Directive', communique: 'Communiqué' }
const TYPE_ICONS = { ordre_du_jour: '📜', ordre_de_mission: '⚔️', directive: '📌', communique: '📢' }

export default function OrdresList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ordres, setOrdres] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [unites, setUnites] = useState([])
  const [form, setForm] = useState({ type: 'ordre_du_jour', titre: '', contenu: '', unite_id: '', date_rp: '' })
  const [msg, setMsg] = useState('')

  const canCreate = user?.isAdmin || user?.isOfficier

  useEffect(() => {
    api.get('/ordres').then(r => setOrdres(r.data.data)).catch(() => {})
    api.get('/unites').then(r => setUnites(r.data.data || r.data)).catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/ordres', { ...form, date_irl: new Date().toISOString().slice(0,10) })
      setShowForm(false); setMsg(`✅ ${res.data.data.numero} émis`); setTimeout(() => setMsg(''), 3000)
      api.get('/ordres').then(r => setOrdres(r.data.data))
    } catch (err) { setMsg(err.response?.data?.message || 'Erreur') }
  }

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton label="← Tableau de bord" />
        {canCreate && <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>{showForm ? '✕' : '+ Nouvel ordre'}</button>}
      </div>
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>📜 Ordres & Directives</h1>
      {msg && <div className="alert alert-success">{msg}</div>}

      {showForm && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <form onSubmit={submit}>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
              <div className="form-group" style={{ flex: 2 }}><label className="form-label">Titre *</label><input className="form-input" value={form.titre} onChange={e => setForm(f=>({...f,titre:e.target.value}))} required /></div>
              <div className="form-group"><label className="form-label">Unité destinataire</label><select className="form-input" value={form.unite_id} onChange={e => setForm(f=>({...f,unite_id:e.target.value}))}>
                <option value="">Toutes les unités</option>{unites.map(u => <option key={u.id} value={u.id}>{u.code}. {u.nom}</option>)}
              </select></div>
            </div>
            <div className="form-group"><label className="form-label">Date RP</label><input className="form-input" value={form.date_rp} onChange={e => setForm(f=>({...f,date_rp:e.target.value}))} placeholder="Ex: Vendredi 14 Février 1944" /></div>
            <div className="form-group"><label className="form-label">Contenu *</label><textarea className="form-input" value={form.contenu} onChange={e => setForm(f=>({...f,contenu:e.target.value}))} required rows={6} style={{ resize: 'vertical' }} /></div>
            <button type="submit" className="btn btn-primary">📜 Émettre l'ordre</button>
          </form>
        </div>
      )}

      <div className="paper-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table" style={{ margin: 0 }}>
          <thead><tr><th></th><th>Numéro</th><th>Titre</th><th>Émis par</th><th>Unité</th><th>Accusés</th><th>Date</th></tr></thead>
          <tbody>
            {ordres.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>Aucun ordre émis</td></tr>
            ) : ordres.map(o => (
              <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/ordres/${o.id}`)}>
                <td>{TYPE_ICONS[o.type]}</td>
                <td><strong>{o.numero}</strong></td>
                <td>{o.titre}</td>
                <td style={{ fontSize: '0.8rem' }}>{o.emis_par_grade ? `${o.emis_par_grade} ` : ''}{o.emis_par_nom}</td>
                <td>{o.unite_code || 'Toutes'}</td>
                <td><span style={{ color: o.nb_accuses > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{o.nb_accuses || 0} ✓</span></td>
                <td style={{ fontSize: '0.78rem' }}>{formatDate(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
