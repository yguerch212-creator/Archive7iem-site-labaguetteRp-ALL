import BackButton from '../../components/BackButton'
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import './pds.css'

const JOURS = ['vendredi', 'samedi', 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi_fin']
const JOURS_LABELS = { vendredi: 'Vendredi (20h →)', samedi: 'Samedi', dimanche: 'Dimanche', lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi_fin: 'Vendredi (→ 20h)' }
const JOURS_SHORT = { vendredi: 'Ven.→', samedi: 'Sam.', dimanche: 'Dim.', lundi: 'Lun.', mardi: 'Mar.', mercredi: 'Mer.', jeudi: 'Jeu.', vendredi_fin: '→Ven.' }

function getWeekString(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function prevWeek(w) { const [y, wn] = w.split('-W').map(Number); return wn <= 1 ? `${y-1}-W52` : `${y}-W${String(wn-1).padStart(2,'0')}` }
function nextWeek(w) { const [y, wn] = w.split('-W').map(Number); return wn >= 52 ? `${y+1}-W01` : `${y}-W${String(wn+1).padStart(2,'0')}` }

function weekLabel(w) {
  try {
    const [y, wn] = w.split('-W').map(Number)
    const jan4 = new Date(Date.UTC(y, 0, 4))
    const dayOfWeek = jan4.getUTCDay() || 7
    const monday = new Date(jan4)
    monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (wn - 1) * 7)
    const friday = new Date(monday); friday.setUTCDate(monday.getUTCDate() + 4)
    const nextFriday = new Date(friday); nextFriday.setUTCDate(friday.getUTCDate() + 7)
    const fmt = d => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    return `Semaine du ven. ${fmt(friday)} au ven. ${fmt(nextFriday)}`
  } catch { return w }
}

function parseCreneaux(text) {
  if (!text || text.trim().toUpperCase() === 'X' || text.trim() === '') return 0
  let total = 0
  for (const slot of text.split(',').map(s => s.trim()).filter(Boolean)) {
    const m = slot.match(/(\d{1,2})h?(\d{0,2})\s*-\s*(\d{1,2})h?(\d{0,2})/)
    if (m) { const s = parseInt(m[1])+(parseInt(m[2]||0)/60), e = parseInt(m[3])+(parseInt(m[4]||0)/60); if (e>s) total+=(e-s) }
  }
  return Math.round(total * 100) / 100
}

function formatHeures(h) {
  if (!h || h === 0) return '0h00'
  const hrs = Math.floor(h), mins = Math.round((h - hrs) * 60)
  return `${hrs}h${String(mins).padStart(2, '0')}`
}

export default function PDS() {
  const { user } = useAuth()
  const [view, setView] = useState('list') // 'list', 'edit', 'detail', 'permissions'
  const [semaine, setSemaine] = useState(getWeekString())
  const [allData, setAllData] = useState([])
  const [stats, setStats] = useState({})
  const [semaineActuelle, setSemaineActuelle] = useState('')
  const [filterUnite, setFilterUnite] = useState('')
  const [message, setMessage] = useState('')
  const [selectedEffectif, setSelectedEffectif] = useState(null)

  // Edit PDS state
  const [myPds, setMyPds] = useState({})
  const [saving, setSaving] = useState(false)

  // Permissions
  const [permissions, setPermissions] = useState([])
  const [showPermForm, setShowPermForm] = useState(false)
  const [permForm, setPermForm] = useState({ date_debut: '', date_fin: '', raison: '' })

  const isPrivileged = user?.isAdmin || user?.isRecenseur
  const hasEffectif = !!user?.effectif_id

  const loadAll = useCallback(async () => {
    try {
      const res = await api.get('/pds', { params: { semaine } })
      setAllData(res.data.data); setStats(res.data.stats); setSemaineActuelle(res.data.semaineActuelle)
    } catch {}
  }, [semaine])

  const loadMine = useCallback(async () => {
    if (!hasEffectif) return
    try {
      const res = await api.get('/pds/mine', { params: { semaine } })
      if (res.data.data) {
        const d = res.data.data
        setMyPds({ lundi: d.lundi||'', mardi: d.mardi||'', mercredi: d.mercredi||'', jeudi: d.jeudi||'', vendredi: d.vendredi||'', vendredi_fin: d.vendredi_fin||'', samedi: d.samedi||'', dimanche: d.dimanche||'' })
      } else {
        setMyPds({ lundi:'', mardi:'', mercredi:'', jeudi:'', vendredi:'', vendredi_fin:'', samedi:'', dimanche:'' })
      }
    } catch {}
  }, [semaine, hasEffectif])

  useEffect(() => { loadAll(); loadMine() }, [loadAll, loadMine])
  useEffect(() => { if (view === 'permissions') loadPermissions() }, [view])

  const loadPermissions = async () => { try { const r = await api.get('/pds/permissions'); setPermissions(r.data.data) } catch {} }

  const myTotal = JOURS.reduce((sum, j) => sum + parseCreneaux(myPds[j]), 0)
  const myValide = myTotal >= 6

  const saveMine = async () => {
    setSaving(true)
    try {
      await api.put('/pds/saisie', { effectif_id: user.effectif_id, semaine, ...myPds })
      setMessage('PDS sauvegardé ✓'); setTimeout(() => setMessage(''), 2000)
      loadAll(); setView('list')
    } catch (err) { setMessage('Erreur: ' + (err.response?.data?.message || err.message)) }
    setSaving(false)
  }

  const submitPermission = async (e) => {
    e.preventDefault()
    try {
      await api.post('/pds/permissions', permForm)
      setShowPermForm(false); setPermForm({ date_debut:'', date_fin:'', raison:'' })
      setMessage('Demande envoyée'); setTimeout(() => setMessage(''), 2000); loadPermissions()
    } catch (err) { setMessage('Erreur') }
  }

  const traiterPermission = async (id, statut) => {
    const notes = statut === 'Refusee' ? prompt('Motif du refus :') : null
    try { await api.put(`/pds/permissions/${id}/traiter`, { statut, notes }); loadPermissions() } catch {}
  }

  const unites = [...new Set(allData.map(d => d.unite_code))].sort()
  const filteredAll = filterUnite ? allData.filter(d => d.unite_code === filterUnite) : allData

  // ===== EDIT VIEW =====
  if (view === 'edit') {
    return (
      <div className="pds-page">
        <button className="btn btn-secondary btn-small" onClick={() => setView('list')} style={{ marginBottom: 'var(--space-md)' }}>← Retour</button>
        <h2 style={{ marginBottom: 'var(--space-lg)' }}>✏️ Mon PDS — {weekLabel(semaine)}</h2>

        <div className="paper-card" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <strong>{user?.prenom} {user?.nom}</strong><br/>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.grade_nom || '—'} — {user?.unite || '—'}</span>
            </div>
            <div className={`mon-pds-total ${myValide ? 'total-valid' : 'total-invalid'}`}>
              <span className="total-value">{formatHeures(myTotal)}</span>
              <span className="total-label">{myValide ? '✅ Validé (≥6h)' : '❌ < 6h minimum'}</span>
            </div>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 var(--space-sm)' }}>
            💡 Format : 17h30-19h, 20h-22h — ou X si absent. Sauvegardez régulièrement !
          </p>

          {JOURS.map(jour => {
            const heures = parseCreneaux(myPds[jour])
            return (
              <div key={jour} className="jour-row">
                <label className="jour-label">{JOURS_LABELS[jour]}</label>
                <input type="text" className="jour-input" value={myPds[jour] || ''} onChange={e => setMyPds(p => ({ ...p, [jour]: e.target.value }))} placeholder="17h30-19h, 20h-22h ou X" />
                <span className={`jour-heures ${heures > 0 ? 'has-hours' : ''}`}>
                  {myPds[jour] && myPds[jour].trim().toUpperCase() !== 'X' ? formatHeures(heures) : '—'}
                </span>
              </div>
            )
          })}

          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', marginTop: 'var(--space-lg)' }}>
            <button className="btn btn-primary" onClick={saveMine} disabled={saving}>{saving ? 'Sauvegarde...' : '💾 Sauvegarder'}</button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total : <strong>{formatHeures(myTotal)}</strong></span>
          </div>
        </div>
      </div>
    )
  }

  // ===== DETAIL POPUP =====
  const DetailPopup = () => {
    if (!selectedEffectif) return null
    const eff = selectedEffectif
    return (
      <div className="popup-overlay" onClick={() => setSelectedEffectif(null)}>
        <div className="popup-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
          <button className="popup-close" onClick={() => setSelectedEffectif(null)}>✕</button>
          <h2 style={{ marginTop: 0 }}>📋 PDS — {eff.prenom} {eff.nom}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{eff.grade_nom || '—'} — {eff.unite_code} {eff.unite_nom}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}><th style={thS}>Jour</th><th style={thS}>Créneaux</th><th style={thS}>Heures</th></tr></thead>
            <tbody>
              {JOURS.map(j => (
                <tr key={j} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={tdS}><strong>{JOURS_LABELS[j]}</strong></td>
                  <td style={{ ...tdS, fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{eff[j] || '—'}</td>
                  <td style={tdS}>{eff[j] ? formatHeures(parseCreneaux(eff[j])) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border-color)' }}>
                <td colSpan={2} style={tdS}><strong>Total</strong></td>
                <td style={tdS}><strong style={{ color: eff.valide ? 'var(--success)' : 'var(--danger)' }}>{formatHeures(eff.total_heures)} {eff.valide ? '✅' : '❌'}</strong></td>
              </tr>
            </tfoot>
          </table>
          <div style={{ textAlign: 'center', marginTop: '1rem', display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
            {user?.effectif_id === eff.effectif_id && (
              <button className="btn btn-primary" onClick={() => { setSelectedEffectif(null); setView('edit') }}>✏️ Éditer mon PDS</button>
            )}
            {user?.isAdmin && eff.pds_id && (
              <button className="btn btn-danger btn-small" onClick={async () => {
                if (!confirm('Supprimer ce PDS ?')) return
                try { await api.delete(`/pds/${eff.pds_id}`); setSelectedEffectif(null); load() } catch (err) { alert('Erreur') }
              }}>🗑️ Supprimer</button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ===== PERMISSIONS VIEW =====
  if (view === 'permissions') {
    return (
      <div className="pds-page">
        <button className="btn btn-secondary btn-small" onClick={() => setView('list')} style={{ marginBottom: 'var(--space-md)' }}>← Retour</button>
        <h2>🏖️ Permissions d'absence</h2>
        {hasEffectif && (
          <div style={{ marginBottom: '1rem' }}>
            <button className="btn btn-primary" onClick={() => setShowPermForm(!showPermForm)}>{showPermForm ? '✕ Annuler' : '+ Demander une permission'}</button>
          </div>
        )}
        {showPermForm && (
          <div className="paper-card" style={{ marginBottom: '1rem', padding: 'var(--space-lg)' }}>
            <form onSubmit={submitPermission}>
              <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                <div className="form-group"><label className="form-label">Du *</label><input type="date" className="form-input" value={permForm.date_debut} onChange={e => setPermForm(p => ({...p, date_debut: e.target.value}))} required /></div>
                <div className="form-group"><label className="form-label">Au *</label><input type="date" className="form-input" value={permForm.date_fin} onChange={e => setPermForm(p => ({...p, date_fin: e.target.value}))} required /></div>
              </div>
              <div className="form-group"><label className="form-label">Raison *</label><textarea className="form-input" value={permForm.raison} onChange={e => setPermForm(p => ({...p, raison: e.target.value}))} required rows={2} /></div>
              <button type="submit" className="btn btn-primary">📨 Envoyer</button>
            </form>
          </div>
        )}
        {permissions.length === 0 ? (
          <div className="paper-card" style={{ textAlign: 'center', padding: '2rem' }}>Aucune demande</div>
        ) : (
          <div className="paper-card" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={thS}>Effectif</th><th style={thS}>Du</th><th style={thS}>Au</th><th style={thS}>Raison</th><th style={thS}>Statut</th>
                {(isPrivileged || user?.isOfficier) && <th style={thS}>Actions</th>}
              </tr></thead>
              <tbody>
                {permissions.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={tdS}><strong>{p.grade_nom ? `${p.grade_nom} ` : ''}{p.prenom} {p.nom}</strong><br/><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.unite_code}</span></td>
                    <td style={tdS}>{p.date_debut ? new Date(p.date_debut+'T00:00').toLocaleDateString('fr-FR') : '?'}</td>
                    <td style={tdS}>{p.date_fin ? new Date(p.date_fin+'T00:00').toLocaleDateString('fr-FR') : '?'}</td>
                    <td style={tdS}>{p.raison}</td>
                    <td style={tdS}><span className={`badge ${p.statut === 'Approuvee' ? 'badge-green' : p.statut === 'Refusee' ? 'badge-red' : 'badge-warning'}`}>{p.statut === 'Approuvee' ? '✅ Approuvée' : p.statut === 'Refusee' ? '❌ Refusée' : '⏳ En attente'}</span></td>
                    {(isPrivileged || user?.isOfficier) && (
                      <td style={tdS}>{p.statut === 'En attente' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-primary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => traiterPermission(p.id, 'Approuvee')}>✅</button>
                          <button className="btn btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem', color: 'var(--danger)' }} onClick={() => traiterPermission(p.id, 'Refusee')}>❌</button>
                        </div>
                      )}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // ===== LIST VIEW (default) =====
  return (
    <div className="pds-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: '0.5rem' }}>
        <BackButton label="← Tableau de bord" />
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {hasEffectif && <button className="btn btn-primary btn-small" onClick={() => setView('edit')}>✏️ Mon PDS</button>}
          <button className="btn btn-secondary btn-small" onClick={() => setView('permissions')}>🏖️ Permissions</button>
          {isPrivileged && <Link to={`/pds/recap?semaine=${semaine}`} className="btn btn-secondary btn-small">📊 Récap</Link>}
        </div>
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>📋 Prise De Service</h1>

      {/* Week nav */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <button className="btn btn-secondary btn-small" onClick={() => setSemaine(prevWeek(semaine))}>◀</button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
          {weekLabel(semaine)}
          {semaine === semaineActuelle && <span className="badge badge-green" style={{ marginLeft: 8 }}>En cours</span>}
        </span>
        <button className="btn btn-secondary btn-small" onClick={() => setSemaine(nextWeek(semaine))}>▶</button>
        {semaine !== semaineActuelle && (
          <button className="btn btn-sm" onClick={() => setSemaine(getWeekString())}>Actuelle</button>
        )}
      </div>

      {message && <div className="pds-message-bar">{message}</div>}

      {/* Stats chips */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
        <span className="pds-stat-chip">{stats.saisis || 0} remplis</span>
        <span className="pds-stat-chip chip-green">{stats.valides || 0} validés</span>
        <span className="pds-stat-chip chip-red">{(stats.saisis || 0) - (stats.valides || 0)} insuffisants</span>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
        <select value={filterUnite} onChange={e => setFilterUnite(e.target.value)} className="form-input" style={{ maxWidth: 220 }}>
          <option value="">Toutes les unités</option>
          {unites.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* Table */}
      {filteredAll.length === 0 ? (
        <div className="paper-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Aucun PDS rempli pour cette semaine</p>
        </div>
      ) : (
        <div className="paper-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={thS}>Effectif</th>
                <th style={thS}>Unité</th>
                <th style={thS}>Total</th>
                <th style={thS}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredAll.map(eff => (
                <tr key={eff.effectif_id}
                  onClick={() => setSelectedEffectif(eff)}
                  style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'var(--military-light, rgba(107,143,60,0.08))'}
                  onMouseLeave={ev => ev.currentTarget.style.background = ''}
                >
                  <td style={tdS}>
                    <strong>{eff.grade_nom ? `${eff.grade_nom} ` : ''}{eff.prenom} {eff.nom}</strong>
                  </td>
                  <td style={tdS}>{eff.unite_code}</td>
                  <td style={tdS}><strong style={{ color: eff.valide ? 'var(--success)' : 'var(--danger)' }}>{formatHeures(eff.total_heures)}</strong></td>
                  <td style={tdS}>
                    {eff.valide
                      ? <span className="badge badge-green">✅ Validé</span>
                      : <span className="badge badge-red">❌ &lt; 6h</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailPopup />
    </div>
  )
}

const thS = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)', whiteSpace: 'nowrap' }
const tdS = { padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'middle' }
