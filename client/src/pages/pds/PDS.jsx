import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import './pds.css'

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const JOURS_LABELS = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche' }

function getWeekString(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function prevWeek(w) {
  const [y, wn] = w.split('-W').map(Number)
  if (wn <= 1) return `${y - 1}-W52`
  return `${y}-W${String(wn - 1).padStart(2, '0')}`
}
function nextWeek(w) {
  const [y, wn] = w.split('-W').map(Number)
  if (wn >= 52) return `${y + 1}-W01`
  return `${y}-W${String(wn + 1).padStart(2, '0')}`
}

// Parse "17h30-17h50, 19h40-22h" → decimal hours
function parseCreneaux(text) {
  if (!text || text.trim().toUpperCase() === 'X' || text.trim() === '') return 0
  let total = 0
  const slots = text.split(',').map(s => s.trim()).filter(Boolean)
  for (const slot of slots) {
    const match = slot.match(/(\d{1,2})h?(\d{0,2})\s*-\s*(\d{1,2})h?(\d{0,2})/)
    if (match) {
      const start = parseInt(match[1]) + (parseInt(match[2] || 0) / 60)
      const end = parseInt(match[3]) + (parseInt(match[4] || 0) / 60)
      if (end > start) total += (end - start)
    }
  }
  return Math.round(total * 100) / 100
}

function formatHeures(h) {
  if (!h || h === 0) return '0h00'
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return `${hrs}h${String(mins).padStart(2, '0')}`
}

export default function PDS() {
  const { user } = useAuth()
  const [tab, setTab] = useState('mon-pds') // 'mon-pds', 'tous', 'permissions'
  const [semaine, setSemaine] = useState(getWeekString())
  const [allData, setAllData] = useState([])
  const [stats, setStats] = useState({})
  const [semaineActuelle, setSemaineActuelle] = useState('')
  const [filterUnite, setFilterUnite] = useState('')
  const [message, setMessage] = useState('')
  const [selectedEffectif, setSelectedEffectif] = useState(null) // for detail panel

  // Mon PDS state
  const [myPds, setMyPds] = useState({})
  const [saving, setSaving] = useState(false)

  // Permissions state
  const [permissions, setPermissions] = useState([])
  const [showPermForm, setShowPermForm] = useState(false)
  const [permForm, setPermForm] = useState({ date_debut: '', date_fin: '', raison: '' })

  const isPrivileged = user?.isAdmin || user?.isRecenseur
  const hasEffectif = !!user?.effectif_id

  const loadAll = useCallback(async () => {
    try {
      const res = await api.get('/pds', { params: { semaine } })
      setAllData(res.data.data)
      setStats(res.data.stats)
      setSemaineActuelle(res.data.semaineActuelle)
    } catch (err) { console.error(err) }
  }, [semaine])

  const loadMine = useCallback(async () => {
    if (!hasEffectif) return
    try {
      const res = await api.get('/pds/mine', { params: { semaine } })
      if (res.data.data) {
        const d = res.data.data
        setMyPds({
          lundi: d.lundi || '', mardi: d.mardi || '', mercredi: d.mercredi || '',
          jeudi: d.jeudi || '', vendredi: d.vendredi || '', samedi: d.samedi || '', dimanche: d.dimanche || ''
        })
      } else {
        setMyPds({ lundi: '', mardi: '', mercredi: '', jeudi: '', vendredi: '', samedi: '', dimanche: '' })
      }
    } catch (err) { console.error(err) }
  }, [semaine, hasEffectif])

  const loadPermissions = async () => {
    try {
      const res = await api.get('/pds/permissions')
      setPermissions(res.data.data)
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    loadAll()
    loadMine()
  }, [loadAll, loadMine])

  useEffect(() => {
    if (tab === 'permissions') loadPermissions()
  }, [tab])

  // Compute my total
  const myTotal = JOURS.reduce((sum, j) => sum + parseCreneaux(myPds[j]), 0)
  const myValide = myTotal >= 6

  const saveMine = async () => {
    setSaving(true)
    try {
      await api.put('/pds/saisie', {
        effectif_id: user.effectif_id,
        semaine,
        ...myPds
      })
      setMessage('PDS sauvegardé ✓')
      setTimeout(() => setMessage(''), 2000)
      loadAll()
    } catch (err) {
      setMessage('Erreur: ' + (err.response?.data?.message || err.message))
    }
    setSaving(false)
  }

  const submitPermission = async (e) => {
    e.preventDefault()
    try {
      await api.post('/pds/permissions', permForm)
      setShowPermForm(false)
      setPermForm({ date_debut: '', date_fin: '', raison: '' })
      setMessage('Demande de permission envoyée')
      setTimeout(() => setMessage(''), 2000)
      loadPermissions()
    } catch (err) {
      setMessage('Erreur: ' + (err.response?.data?.message || err.message))
    }
  }

  const traiterPermission = async (id, statut) => {
    const notes = statut === 'Refusee' ? prompt('Motif du refus :') : null
    try {
      await api.put(`/pds/permissions/${id}/traiter`, { statut, notes })
      loadPermissions()
    } catch (err) {
      setMessage('Erreur: ' + (err.response?.data?.message || err.message))
    }
  }

  // Group by unite for "tous"
  const unites = [...new Set(allData.map(d => d.unite_code))].sort()
  const filteredAll = filterUnite ? allData.filter(d => d.unite_code === filterUnite) : allData
  const grouped = {}
  filteredAll.forEach(d => {
    if (!grouped[d.unite_code]) grouped[d.unite_code] = { nom: d.unite_nom, effectifs: [] }
    grouped[d.unite_code].effectifs.push(d)
  })

  return (
    <div className="pds-page">
      <div className="pds-header">
        <h1>📋 Prise De Service</h1>
        <div className="pds-week-nav">
          <button className="btn-ghost" onClick={() => setSemaine(prevWeek(semaine))}>◀</button>
          <span className="pds-week-label">
            {semaine}
            {semaine === semaineActuelle && <span className="badge badge-green">En cours</span>}
          </span>
          <button className="btn-ghost" onClick={() => setSemaine(nextWeek(semaine))}>▶</button>
          {semaine !== semaineActuelle && (
            <button className="btn-sm" onClick={() => setSemaine(getWeekString())}>Semaine actuelle</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="pds-tabs">
        {hasEffectif && <button className={`pds-tab ${tab === 'mon-pds' ? 'active' : ''}`} onClick={() => setTab('mon-pds')}>📝 Mon PDS</button>}
        <button className={`pds-tab ${tab === 'tous' ? 'active' : ''}`} onClick={() => setTab('tous')}>👥 Tous les effectifs</button>
        <button className={`pds-tab ${tab === 'permissions' ? 'active' : ''}`} onClick={() => setTab('permissions')}>🏖️ Permissions</button>
      </div>

      {message && <div className="pds-message-bar">{message}</div>}

      {/* ===== TAB: MON PDS ===== */}
      {tab === 'mon-pds' && (
        hasEffectif ? (
          <div className="mon-pds">
            <div className="mon-pds-header">
              <div>
                <strong>Prise de service :</strong><br />
                <span className="mon-pds-identity">[{user.prenom} {user.nom}]</span><br />
                <span className="mon-pds-identity">[{user.grade_nom || '—'}]</span><br />
                <span className="mon-pds-identity">[{user.unite_nom || '—'}]</span>
              </div>
              <div className={`mon-pds-total ${myValide ? 'total-valid' : 'total-invalid'}`}>
                <span className="total-value">{formatHeures(myTotal)}</span>
                <span className="total-label">{myValide ? '✅ Validé' : '❌ < 6h minimum'}</span>
              </div>
            </div>

            <div className="mon-pds-form">
              <p className="mon-pds-subtitle"><strong>Présence sur le front :</strong></p>
              {JOURS.map(jour => {
                const heures = parseCreneaux(myPds[jour])
                return (
                  <div key={jour} className="jour-row">
                    <label className="jour-label">{JOURS_LABELS[jour]}</label>
                    <input
                      type="text"
                      className="jour-input"
                      value={myPds[jour] || ''}
                      onChange={e => setMyPds(p => ({ ...p, [jour]: e.target.value }))}
                      placeholder="17h30-19h, 20h-22h ou X"
                    />
                    <span className={`jour-heures ${heures > 0 ? 'has-hours' : ''}`}>
                      {myPds[jour] && myPds[jour].trim().toUpperCase() !== 'X' ? formatHeures(heures) : '—'}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="mon-pds-actions">
              <button className="btn btn-primary" onClick={saveMine} disabled={saving}>
                {saving ? 'Sauvegarde...' : '💾 Sauvegarder mon PDS'}
              </button>
              <span className="total-recap">Total Semaine : <strong>{formatHeures(myTotal)}</strong></span>
            </div>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Votre compte n'est pas lié à un effectif.</p>
            <p className="text-muted">Contactez un administrateur pour lier votre compte.</p>
          </div>
        )
      )}

      {/* ===== TAB: TOUS ===== */}
      {tab === 'tous' && (
        <>
          <div className="pds-stats">
            <div className="stat-card">
              <div className="stat-value">{stats.total || 0}</div>
              <div className="stat-label">Effectifs</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.saisis || 0}</div>
              <div className="stat-label">PDS remplis</div>
            </div>
            <div className="stat-card stat-green">
              <div className="stat-value">{stats.valides || 0}</div>
              <div className="stat-label">Validés (≥6h)</div>
            </div>
            <div className="stat-card stat-red">
              <div className="stat-value">{(stats.saisis || 0) - (stats.valides || 0)}</div>
              <div className="stat-label">Non validés</div>
            </div>
          </div>

          <div className="pds-filters">
            <select value={filterUnite} onChange={e => setFilterUnite(e.target.value)}>
              <option value="">Toutes les unités</option>
              {unites.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {/* Detail panel (shown when clicking a name) */}
          {selectedEffectif && (
            <div className="pds-detail-overlay" onClick={() => setSelectedEffectif(null)}>
              <div className="pds-detail-panel" onClick={e => e.stopPropagation()}>
                <button className="pds-detail-close" onClick={() => setSelectedEffectif(null)}>✕</button>
                <div className="pds-detail-header">
                  <strong>Prise de service :</strong>
                  <div className="pds-detail-identity">[{selectedEffectif.prenom} {selectedEffectif.nom}]</div>
                  <div className="pds-detail-identity">[{selectedEffectif.grade_nom || '—'}]</div>
                  <div className="pds-detail-identity">[{selectedEffectif.unite_code}. {selectedEffectif.unite_nom}]</div>
                </div>
                <div className="pds-detail-body">
                  <strong>Présence sur le front :</strong>
                  {JOURS.map(j => (
                    <div key={j} className="pds-detail-jour">
                      <span className="pds-detail-jour-label">{JOURS_LABELS[j]} :</span>
                      <span className="pds-detail-jour-value">
                        {selectedEffectif[j] ? selectedEffectif[j] : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={`pds-detail-total ${selectedEffectif.valide ? 'total-valid' : selectedEffectif.pds_id ? 'total-invalid' : ''}`}>
                  <strong>Total Semaine : {selectedEffectif.pds_id ? formatHeures(selectedEffectif.total_heures) : 'Non renseigné'}</strong>
                </div>
              </div>
            </div>
          )}

          {Object.entries(grouped).map(([code, { nom, effectifs }]) => (
            <div key={code} className="pds-unite-section">
              <h2 className="pds-unite-title">
                {code} — {nom}
                <span className="pds-unite-stats">
                  {effectifs.filter(e => e.valide).length}/{effectifs.length} validés
                </span>
              </h2>
              <table className="pds-table">
                <thead>
                  <tr>
                    <th style={{width:'30px'}}></th>
                    <th>Grade</th>
                    <th>Nom</th>
                    <th>Fonction</th>
                    <th style={{textAlign:'right'}}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {effectifs.map(eff => {
                    const filled = eff.pds_id !== null
                    return (
                      <tr key={eff.effectif_id}
                          className={`pds-row-clickable ${filled ? (eff.valide ? 'row-valid' : 'row-invalid') : 'row-empty'}`}
                          onClick={() => setSelectedEffectif(eff)}
                      >
                        <td className="td-pastille">
                          <span className={`pastille ${filled ? (eff.valide ? 'pastille-green' : 'pastille-red') : 'pastille-grey'}`}></span>
                        </td>
                        <td className="td-grade">{eff.grade_nom || '—'}</td>
                        <td className="td-name">{eff.prenom} {eff.nom}</td>
                        <td className="td-fonction">{eff.fonction || '—'}</td>
                        <td className={`td-total ${eff.valide ? 'total-ok' : filled ? 'total-ko' : ''}`}>
                          {filled ? formatHeures(eff.total_heures) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {/* ===== TAB: PERMISSIONS ===== */}
      {tab === 'permissions' && (
        <>
          {hasEffectif && (
            <div style={{ marginBottom: '1rem' }}>
              <button className="btn btn-primary" onClick={() => setShowPermForm(!showPermForm)}>
                {showPermForm ? '✕ Annuler' : '+ Demander une permission'}
              </button>
            </div>
          )}

          {showPermForm && (
            <div className="card perm-form">
              <h3>Demande de permission</h3>
              <form onSubmit={submitPermission}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Du *</label>
                    <input type="date" className="form-input" value={permForm.date_debut} onChange={e => setPermForm(p => ({...p, date_debut: e.target.value}))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Au *</label>
                    <input type="date" className="form-input" value={permForm.date_fin} onChange={e => setPermForm(p => ({...p, date_fin: e.target.value}))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Raison *</label>
                  <textarea className="form-input form-textarea" value={permForm.raison} onChange={e => setPermForm(p => ({...p, raison: e.target.value}))} required rows={2} placeholder="Raison de votre absence..." />
                </div>
                <button type="submit" className="btn btn-primary">📨 Envoyer la demande</button>
              </form>
            </div>
          )}

          {permissions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Aucune demande de permission</p>
            </div>
          ) : (
            <div className="perm-list">
              {permissions.map(p => (
                <div key={p.id} className={`card perm-card perm-${p.statut.toLowerCase().replace(/\s/g, '-')}`}>
                  <div className="perm-header">
                    <div>
                      <span className="perm-name">{p.grade_nom ? `${p.grade_nom} ` : ''}{p.prenom} {p.nom}</span>
                      <span className="perm-unite">{p.unite_code}</span>
                    </div>
                    <span className={`perm-statut statut-${p.statut.toLowerCase().replace(/\s/g, '-')}`}>{
                      p.statut === 'En attente' ? '⏳ En attente' :
                      p.statut === 'Approuvee' ? '✅ Approuvée' : '❌ Refusée'
                    }</span>
                  </div>
                  <div className="perm-dates">📅 Du {p.date_debut} au {p.date_fin}</div>
                  <div className="perm-raison">{p.raison}</div>
                  {p.notes_traitement && <div className="perm-notes">💬 {p.notes_traitement}</div>}
                  {p.traite_par_nom && <div className="perm-meta">Traité par {p.traite_par_nom}</div>}
                  {p.statut === 'En attente' && (isPrivileged || user?.isOfficier) && (
                    <div className="perm-actions">
                      <button className="btn btn-sm btn-success" onClick={() => traiterPermission(p.id, 'Approuvee')}>✅ Approuver</button>
                      <button className="btn btn-sm btn-danger-sm" onClick={() => traiterPermission(p.id, 'Refusee')}>❌ Refuser</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
