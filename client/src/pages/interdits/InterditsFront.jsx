import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'

export default function InterditsFront() {
  const { user } = useAuth()
  const [interdits, setInterdits] = useState([])
  const [showAll, setShowAll] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState({ effectif_id: '', effectif_nom: '', motif: '', type: 'Disciplinaire', date_debut: new Date().toISOString().slice(0, 10), date_fin: '', condition_fin: '', notes: '' })

  // Officiers, Feldgendarmerie (254), Sanitäts sous-off+ can create
  const canCreate = user?.isAdmin || user?.isOfficier || user?.unite_code === '254' ||
    (user?.unite_code === '916S' && (user?.isRecenseur || (user?.grade_rang && user?.grade_rang >= 35)))

  useEffect(() => { load() }, [showAll])

  const load = async () => {
    try {
      const res = await api.get('/interdits', { params: showAll ? { all: '1' } : {} })
      setInterdits(res.data.data)
    } catch (err) { console.error(err) }
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/interdits', form)
      setShowForm(false)
      setForm({ effectif_id: '', effectif_nom: '', motif: '', type: 'Disciplinaire', date_debut: new Date().toISOString().slice(0, 10), date_fin: '', condition_fin: '', notes: '' })
      setMessage({ type: 'success', text: 'Interdit de front prononcé ✓' })
      setTimeout(() => setMessage(null), 3000)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const lever = async (id) => {
    const motif = prompt('Motif de la levée :')
    if (!motif) return
    try {
      await api.put(`/interdits/${id}/lever`, { motif_levee: motif })
      setMessage({ type: 'success', text: 'Interdit levé ✓' })
      setTimeout(() => setMessage(null), 3000)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const fmtDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('fr-FR') : '—'

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton label="← Tableau de bord" />
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
          <label style={{ fontSize: '0.8rem', display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
            Voir les levés
          </label>
          {canCreate && (
            <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>
              {showForm ? '✕ Annuler' : '+ Prononcer un interdit'}
            </button>
          )}
        </div>
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>🚫 Interdits de Front</h1>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {showForm && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>Prononcer un interdit de front</h3>
          <form onSubmit={submit}>
            <div className="form-row" style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Effectif concerné *</label>
                <EffectifAutocomplete
                  value={form.effectif_nom}
                  onChange={(text, eff) => setForm(p => ({...p, effectif_nom: text, effectif_id: eff?.id || ''}))}
                  onSelect={eff => setForm(p => ({...p, effectif_id: eff.id, effectif_nom: `${eff.prenom} ${eff.nom}`}))}
                  placeholder="Rechercher un effectif..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                  <option value="Disciplinaire">Disciplinaire</option>
                  <option value="Medical">Médical</option>
                  <option value="Administratif">Administratif</option>
                </select>
              </div>
            </div>
            <div className="form-row" style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Date début *</label>
                <input type="date" className="form-input" value={form.date_debut} onChange={e => setForm(p => ({...p, date_debut: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Date fin (vide = indéterminé)</label>
                <input type="date" className="form-input" value={form.date_fin} onChange={e => setForm(p => ({...p, date_fin: e.target.value}))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Condition de fin / Raison (optionnel)</label>
              <input type="text" className="form-input" value={form.condition_fin} onChange={e => setForm(p => ({...p, condition_fin: e.target.value}))} placeholder="Ex: Effectuer sa visite médicale, Compléter 3 PDS consécutifs..." />
            </div>
            <div className="form-group">
              <label className="form-label">Motif *</label>
              <textarea className="form-input" value={form.motif} onChange={e => setForm(p => ({...p, motif: e.target.value}))} required rows={3} placeholder="Raison de l'interdit de front..." style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" className="btn btn-primary">🚫 Prononcer l'interdit</button>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="paper-card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={th}>Statut</th>
              <th style={th}>Effectif</th>
              <th style={th}>Type</th>
              <th style={th}>Motif</th>
              <th style={th}>Du</th>
              <th style={th}>Au</th>
              <th style={th}>Ordonné par</th>
              {canCreate && <th style={th}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {interdits.length === 0 ? (
              <tr><td colSpan={canCreate ? 8 : 7} style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>
                ✅ Aucun interdit de front {showAll ? '' : 'actif'}
              </td></tr>
            ) : interdits.map(i => (
              <tr key={i.id} style={{ borderBottom: '1px solid var(--border-color)', background: i.actif ? 'rgba(139,74,71,0.04)' : '' }}>
                <td style={td}>
                  {i.actif
                    ? <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.8rem' }}>🔴 ACTIF</span>
                    : <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>✅ Levé</span>
                  }
                </td>
                <td style={td}><strong>{i.effectif_grade ? `${i.effectif_grade} ` : ''}{i.effectif_prenom} {i.effectif_nom}</strong><br/><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{i.effectif_unite_code || ''}</span></td>
                <td style={td}><span className={`badge ${i.type === 'Disciplinaire' ? 'badge-red' : i.type === 'Medical' ? 'badge-warning' : 'badge-muted'}`}>{i.type}</span></td>
                <td style={{ ...td, maxWidth: 250 }}>{i.motif}</td>
                <td style={td}>{fmtDate(i.date_debut)}</td>
                <td style={td}>
                  {i.date_fin ? fmtDate(i.date_fin) : 'Indéterminé'}
                  {i.condition_fin && <><br/><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>📋 {i.condition_fin}</span></>}
                </td>
                <td style={td}>
                  {i.ordonne_par_nom}
                  {!i.actif && i.leve_par_nom && <>
                    <br/><span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Levé par {i.leve_par_nom}</span>
                    {i.motif_levee && <><br/><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Motif: {i.motif_levee}</span></>}
                  </>}
                </td>
                {canCreate && (
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {i.actif && <button className="btn btn-sm btn-primary" style={{ fontSize: '0.75rem', padding: '4px 10px' }} onClick={() => lever(i.id)}>✅ Lever</button>}
                      {user?.isAdmin && <button className="btn btn-sm" style={{ fontSize: '0.75rem', padding: '4px 8px', color: 'var(--danger)' }} onClick={async () => {
                        if (!confirm('Supprimer cet interdit ?')) return
                        try { await api.delete(`/interdits/${i.id}`); load() } catch (err) { alert('Erreur') }
                      }}>🗑️</button>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)', whiteSpace: 'nowrap' }
const td = { padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'top' }
