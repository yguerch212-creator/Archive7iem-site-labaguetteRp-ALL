import BackButton from '../../components/BackButton'
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import { exportToPdf, exportToImage } from '../../utils/exportPdf'
import { exportCsv } from '../../utils/exportCsv'
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
  // Normalize: replace H/h with h, remove spaces around -
  const normalized = text.replace(/[Hh]/g, 'h').replace(/\s*-\s*/g, '-')
  for (const slot of normalized.split(',').map(s => s.trim()).filter(Boolean)) {
    // Match: 20h30-22h, 20h-22h, 20-22, 20h30-22h30, etc.
    const m = slot.match(/(\d{1,2})(?:h(\d{0,2}))?\s*-\s*(\d{1,2})(?:h(\d{0,2}))?/)
    if (m) {
      const s = parseInt(m[1]) + (parseInt(m[2] || 0) / 60)
      const e = parseInt(m[3]) + (parseInt(m[4] || 0) / 60)
      if (e > s) total += (e - s)
    }
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
  const [view, setView] = useState('list') // 'list', 'edit', 'detail', 'permissions', 'rapport'
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

  const [pdsConfig, setPdsConfig] = useState({})

  const isPrivileged = user?.isAdmin || user?.isRecenseur
  const hasEffectif = !!user?.effectif_id

  // Get required hours for a given unite and grade rang
  const getRequiredHours = useCallback((uniteId, gradeRang) => {
    const rangType = gradeRang >= 60 ? 'off' : gradeRang >= 35 ? 'so' : 'hdr'
    const key = `${uniteId}-${rangType}`
    if (pdsConfig[key]) return pdsConfig[key].duree_heures
    return 6 // default
  }, [pdsConfig])

  const loadAll = useCallback(async () => {
    try {
      const res = await api.get('/pds', { params: { semaine } })
      setAllData(res.data.data); setStats(res.data.stats); setSemaineActuelle(res.data.semaineActuelle)
      // On first load, if our local week doesn't match server's current RP week, correct it
      if (!semaineActuelle && res.data.semaineActuelle && semaine !== res.data.semaineActuelle) {
        setSemaine(res.data.semaineActuelle)
      }
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

  useEffect(() => {
    api.get('/pds/config').then(r => {
      const cfg = {}
      for (const row of (r.data.data || [])) {
        cfg[`${row.unite_id}-${row.rang_type}`] = row
      }
      setPdsConfig(cfg)
    }).catch(() => {})
  }, [])
  useEffect(() => { loadAll(); loadMine() }, [loadAll, loadMine])
  useEffect(() => { if (view === 'permissions') loadPermissions() }, [view])

  const loadPermissions = async () => { try { const r = await api.get('/pds/permissions'); setPermissions(r.data.data) } catch {} }

  const myTotal = JOURS.reduce((sum, j) => sum + parseCreneaux(myPds[j]), 0)
  const myRequiredHours = getRequiredHours(user?.unite_id, user?.grade_rang || 0)
  const myValide = myTotal >= myRequiredHours

  const saveMine = async () => {
    setSaving(true)
    try {
      await api.put('/pds/saisie', { effectif_id: user.effectif_id, semaine: semaineActuelle || semaine, ...myPds })
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
    try { await api.put(`/pds/permissions/${id}/traiter`, { statut, notes }); loadPermissions() } catch(err) { alert(err.response?.data?.message || 'Erreur traitement') }
  }

  const unites = [...new Set(allData.map(d => d.unite_code))].sort()
  const filteredAll = filterUnite ? allData.filter(d => d.unite_code === filterUnite) : allData

  // ===== EDIT VIEW =====
  if (view === 'edit') {
    return (
      <div className="pds-page">
        <button className="btn btn-secondary btn-small" onClick={() => setView('list')} style={{ marginBottom: 'var(--space-md)' }}>← Retour</button>
        <h2 style={{ marginBottom: 'var(--space-lg)' }}>✏️ Mon PDS — {weekLabel(semaineActuelle)}</h2>
        {semaine !== semaineActuelle && <div className="pds-message-bar" style={{background:'var(--danger)',color:'#fff',marginBottom:'var(--space-md)'}}>⚠️ Vous ne pouvez remplir que la semaine en cours. Redirigé automatiquement.</div>}

        <div className="paper-card" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <strong>{user?.prenom} {user?.nom}</strong><br/>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.grade_nom || '—'} — {user?.unite || '—'}</span>
            </div>
            <div className={`mon-pds-total ${myValide ? 'total-valid' : 'total-invalid'}`}>
              <span className="total-value">{formatHeures(myTotal)}</span>
              <span className="total-label">{myValide ? `✅ Validé (≥${myRequiredHours}h)` : `❌ < ${myRequiredHours}h minimum`}</span>
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
      <div className="pds-page" id="permissions-content">
        <button className="btn btn-secondary btn-small" onClick={() => setView('list')} style={{ marginBottom: 'var(--space-md)' }}>← Retour</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h2>🏖️ Permissions d'absence</h2>
          <button className="btn btn-secondary btn-small" onClick={() => exportToImage('permissions-content', 'Permissions')}>🖼️ Image</button>
        </div>
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

  // ===== RAPPORT VIEW =====
  if (view === 'rapport') {
    return <RapportSemaine semaine={semaine} setSemaine={setSemaine} semaineActuelle={semaineActuelle} setView={setView} user={user} filterUnite={filterUnite} setFilterUnite={setFilterUnite} />
  }

  // ===== LIST VIEW (default) =====
  return (
    <div className="pds-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: '0.5rem' }}>
        <BackButton label="← Tableau de bord" />
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {hasEffectif && <button className="btn btn-primary btn-small" onClick={() => { setSemaine(semaineActuelle); setView('edit') }}>✏️ Mon PDS</button>}
          {isPrivileged && <button className="btn btn-secondary btn-small" onClick={() => setView('rapport')}>📊 Rapport</button>}
          <button className="btn btn-secondary btn-small" onClick={() => setView('permissions')}>🏖️ Permissions</button>
          {isPrivileged && <>
            <button className="btn btn-secondary btn-small" onClick={() => exportToPdf('pds-table', `PDS_${semaine}`)}>📄 PDF</button>
            <button className="btn btn-secondary btn-small" onClick={() => exportToImage('pds-table', `PDS_${semaine}`)}>🖼️ Image</button>
          </>}
          {isPrivileged && <button className="btn btn-secondary btn-small" onClick={() => exportCsv(filteredAll, [
            { key: r => `${r.grade_nom || ''} ${r.prenom} ${r.nom}`, label: 'Effectif' },
            { key: 'unite_code', label: 'Unité' },
            { key: r => formatHeures(r.total_heures), label: 'Total' },
            { key: r => r.valide ? 'Validé' : 'Insuffisant', label: 'Statut' }
          ], `PDS_${semaine}`)}>📥 CSV</button>}
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
          <button className="btn btn-sm" onClick={() => setSemaine(semaineActuelle)}>Actuelle</button>
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
        <div id="pds-table" className="paper-card" style={{ overflow: 'auto' }}>
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
                    {(() => {
                      const reqH = getRequiredHours(eff.unite_id, eff.grade_rang || 0)
                      return eff.valide || (eff.total_heures >= reqH)
                        ? <span className="badge badge-green">✅ Valide</span>
                        : <span className="badge badge-red">❌ &lt; {reqH}h</span>
                    })()}
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

// ===== RAPPORT SEMAINE COMPONENT =====
function RapportSemaine({ semaine, setSemaine, semaineActuelle, setView, user, filterUnite, setFilterUnite }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState('tous') // 'tous', 'valide', 'insuffisant', 'absent'
  const [includeHDR, setIncludeHDR] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get('/pds/recap', { params: { semaine, includeHDR: includeHDR ? '1' : '0' } })
      .then(r => { setData(r.data.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [semaine, includeHDR])

  if (loading) return <div className="pds-page"><p style={{ textAlign: 'center' }}>Chargement...</p></div>
  if (!data) return <div className="pds-page"><p style={{ textAlign: 'center' }}>Erreur de chargement</p></div>

  const { rows, stats, perms } = data
  const unites = [...new Set(rows.map(r => r.unite_code).filter(Boolean))].sort()

  // Apply filters
  let filtered = rows
  if (filterUnite) filtered = filtered.filter(r => r.unite_code === filterUnite)
  if (filterStatut === 'valide') filtered = filtered.filter(r => r.pds_id && r.valide)
  else if (filterStatut === 'insuffisant') filtered = filtered.filter(r => r.pds_id && !r.valide)
  else if (filterStatut === 'absent') filtered = filtered.filter(r => !r.pds_id && !r.en_permission)
  else if (filterStatut === 'permission') filtered = filtered.filter(r => r.en_permission)

  const validCount = filtered.filter(r => r.pds_id && r.valide).length
  const insuffCount = filtered.filter(r => r.pds_id && !r.valide).length
  const absentCount = filtered.filter(r => !r.pds_id && !r.en_permission).length
  const permCount = filtered.filter(r => r.en_permission).length

  return (
    <div className="pds-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button className="btn btn-secondary btn-small" onClick={() => setView('list')}>← Retour</button>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary btn-small" onClick={() => exportToPdf('rapport-pds', `Rapport_PDS_${semaine}`)}>📄 PDF</button>
          <button className="btn btn-secondary btn-small" onClick={() => exportToImage('rapport-pds', `Rapport_PDS_${semaine}`)}>🖼️ Image</button>
          <button className="btn btn-secondary btn-small" onClick={() => exportCsv(filtered, [
            { key: r => `${r.grade_nom || ''} ${r.prenom} ${r.nom}`, label: 'Effectif' },
            { key: 'unite_code', label: 'Unité' },
            ...JOURS.map(j => ({ key: r => r[j] || '', label: JOURS_SHORT[j] })),
            { key: r => r.pds_id ? formatHeures(r.total_heures) : 'Absent', label: 'Total' },
            { key: r => r.pds_id ? (r.valide ? 'Validé' : 'Insuffisant') : 'Non rempli', label: 'Statut' },
          ], `Rapport_PDS_${semaine}`)}>📥 CSV</button>
        </div>
      </div>

      <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-sm)' }}>📊 Rapport de semaine — PDS</h2>

      {/* Week nav */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
        <button className="btn btn-secondary btn-small" onClick={() => setSemaine(prevWeek(semaine))}>◀</button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
          {weekLabel(semaine)}
          {semaine === semaineActuelle && <span className="badge badge-green" style={{ marginLeft: 8 }}>En cours</span>}
        </span>
        <button className="btn btn-secondary btn-small" onClick={() => setSemaine(nextWeek(semaine))}>▶</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
        <span className="pds-stat-chip">{stats.total} effectifs</span>
        <span className="pds-stat-chip chip-green">{stats.valides} validés ✅</span>
        <span className="pds-stat-chip chip-red">{stats.remplis - stats.valides} insuffisants</span>
        <span className="pds-stat-chip" style={{ background: '#666', color: '#fff' }}>{stats.nonRemplis} absents</span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterUnite} onChange={e => setFilterUnite(e.target.value)} className="form-input" style={{ maxWidth: 200 }}>
          <option value="">Toutes les unités</option>
          {unites.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="form-input" style={{ maxWidth: 200 }}>
          <option value="tous">Tous ({filtered.length})</option>
          <option value="valide">✅ Validés ({validCount})</option>
          <option value="insuffisant">❌ Insuffisants ({insuffCount})</option>
          <option value="absent">⬜ Non rempli ({absentCount})</option>
          <option value="permission">🏖️ En permission ({permCount})</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={includeHDR} onChange={e => setIncludeHDR(e.target.checked)} />
          Inclure HDR
        </label>
      </div>

      {/* Rapport table */}
      <div id="rapport-pds" className="paper-card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={thS}>Effectif</th>
              <th style={thS}>Unité</th>
              {JOURS.map(j => <th key={j} style={{ ...thS, textAlign: 'center', fontSize: '0.75rem' }}>{JOURS_SHORT[j]}</th>)}
              <th style={{ ...thS, textAlign: 'center' }}>Total</th>
              <th style={{ ...thS, textAlign: 'center' }}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(eff => {
              const hasPds = !!eff.pds_id
              const rowBg = !hasPds ? 'rgba(100,100,100,0.06)' : eff.valide ? 'rgba(107,143,60,0.06)' : 'rgba(200,60,60,0.06)'
              return (
                <tr key={eff.effectif_id} style={{ borderBottom: '1px solid var(--border-color)', background: rowBg }}>
                  <td style={tdS}>
                    <strong style={{ fontSize: '0.8rem' }}>{eff.grade_nom ? `${eff.grade_nom} ` : ''}{eff.prenom} {eff.nom}</strong>
                    {eff.fonction && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{eff.fonction}</div>}
                  </td>
                  <td style={tdS}>{eff.unite_code}</td>
                  {JOURS.map(j => {
                    const val = eff[j]
                    const h = val ? parseCreneaux(val) : 0
                    return (
                      <td key={j} style={{ ...tdS, textAlign: 'center', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                        {!hasPds ? '—' : val && val.trim().toUpperCase() === 'X' ? <span style={{ color: '#999' }}>✕</span> : h > 0 ? formatHeures(h) : '—'}
                      </td>
                    )
                  })}
                  <td style={{ ...tdS, textAlign: 'center', fontWeight: 700 }}>
                    {hasPds ? (
                      <span style={{ color: eff.valide ? 'var(--success)' : 'var(--danger)' }}>{formatHeures(eff.total_heures)}</span>
                    ) : (
                      <span style={{ color: '#999' }}>—</span>
                    )}
                  </td>
                  <td style={{ ...tdS, textAlign: 'center' }}>
                    {eff.en_permission ? <span className="badge" style={{ background: '#2c5f7c', color: '#fff', fontSize: '0.7rem' }}>🏖️ Permission</span>
                      : !hasPds ? <span className="badge" style={{ background: '#888', color: '#fff', fontSize: '0.7rem' }}>Non rempli</span>
                      : eff.valide ? <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>✅ Valide</span>
                      : <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>❌ &lt; {eff.required_hours || 6}h</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Active permissions */}
        {perms && perms.length > 0 && (
          <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', borderTop: '2px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-sm)' }}>🏖️ Permissions d'absence actives</h3>
            {perms.map(p => (
              <div key={p.id} style={{ fontSize: '0.8rem', marginBottom: 4 }}>
                <strong>{p.grade_nom} {p.prenom} {p.eff_nom}</strong> — {p.raison}
                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>({p.date_debut} → {p.date_fin})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const thS = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)', whiteSpace: 'nowrap' }
const tdS = { padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'middle' }
