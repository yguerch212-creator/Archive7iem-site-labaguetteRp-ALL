import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import './pds.css'

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

export default function PDS() {
  const { user } = useAuth()
  const [semaine, setSemaine] = useState(getWeekString())
  const [data, setData] = useState([])
  const [stats, setStats] = useState({})
  const [semaineActuelle, setSemaineActuelle] = useState('')
  const [edits, setEdits] = useState({}) // {effectif_id: {heures, rapport_so_fait, notes}}
  const [saving, setSaving] = useState(false)
  const [filterUnite, setFilterUnite] = useState('')
  const [filterStatus, setFilterStatus] = useState('') // '', 'valide', 'nonvalide', 'nonsaisi'
  const [message, setMessage] = useState('')
  const canEditAll = user?.isAdmin || user?.isRecenseur
  const myEffectifId = user?.effectif_id

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/pds', { params: { semaine } })
      setData(res.data.data)
      setStats(res.data.stats)
      setSemaineActuelle(res.data.semaineActuelle)
    } catch (err) {
      console.error(err)
    }
  }, [semaine])

  useEffect(() => { load() }, [load])

  const handleEdit = (effectifId, field, value) => {
    setEdits(prev => ({
      ...prev,
      [effectifId]: { ...prev[effectifId], [field]: value }
    }))
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      if (canEditAll) {
        // Batch save for admin/recenseur
        const entries = Object.entries(edits).map(([effectif_id, vals]) => ({
          effectif_id: parseInt(effectif_id),
          heures: parseFloat(vals.heures) || 0,
          rapport_so_fait: vals.rapport_so_fait || false,
          notes: vals.notes || null
        }))
        await api.put('/api/pds/saisie-batch', { entries, semaine })
      } else {
        // Individual save for regular user (own entry only)
        for (const [effectif_id, vals] of Object.entries(edits)) {
          await api.put('/api/pds/saisie', {
            effectif_id: parseInt(effectif_id),
            semaine,
            heures: parseFloat(vals.heures) || 0,
            rapport_so_fait: vals.rapport_so_fait || false,
            notes: vals.notes || null
          })
        }
      }
      setEdits({})
      setMessage('Sauvegardé ✓')
      setTimeout(() => setMessage(''), 2000)
      load()
    } catch (err) {
      setMessage('Erreur: ' + (err.response?.data?.message || err.message))
    }
    setSaving(false)
  }

  // Group by unite
  const unites = [...new Set(data.map(d => d.unite_code))].sort()

  const filtered = data.filter(d => {
    if (filterUnite && d.unite_code !== filterUnite) return false
    if (filterStatus === 'valide' && !d.valide) return false
    if (filterStatus === 'nonvalide' && (d.valide || d.heures === null)) return false
    if (filterStatus === 'nonsaisi' && d.heures !== null) return false
    return true
  })

  const grouped = {}
  filtered.forEach(d => {
    if (!grouped[d.unite_code]) grouped[d.unite_code] = { nom: d.unite_nom, effectifs: [] }
    grouped[d.unite_code].effectifs.push(d)
  })

  return (
    <div className="pds-page">
      <div className="pds-header">
        <h1>📋 Présence De Service</h1>
        <div className="pds-week-nav">
          <button className="btn-ghost" onClick={() => setSemaine(prevWeek(semaine))}>◀</button>
          <span className="pds-week-label">
            Semaine {semaine}
            {semaine === semaineActuelle && <span className="badge badge-green">En cours</span>}
          </span>
          <button className="btn-ghost" onClick={() => setSemaine(nextWeek(semaine))}>▶</button>
          {semaine !== semaineActuelle && (
            <button className="btn-sm" onClick={() => setSemaine(getWeekString())}>Semaine actuelle</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="pds-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.total || 0}</div>
          <div className="stat-label">Effectifs actifs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.saisis || 0}</div>
          <div className="stat-label">Heures saisies</div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-value">{stats.valides || 0}</div>
          <div className="stat-label">Validés (≥6h)</div>
        </div>
        <div className="stat-card stat-red">
          <div className="stat-value">{(stats.total || 0) - (stats.valides || 0)}</div>
          <div className="stat-label">Non validés</div>
        </div>
        {stats.soNonRapport > 0 && (
          <div className="stat-card stat-orange">
            <div className="stat-value">{stats.soNonRapport}</div>
            <div className="stat-label">SO sans rapport</div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="pds-filters">
        <select value={filterUnite} onChange={e => setFilterUnite(e.target.value)}>
          <option value="">Toutes les unités</option>
          {unites.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="valide">✅ Validés</option>
          <option value="nonvalide">❌ Non validés</option>
          <option value="nonsaisi">⬜ Non saisis</option>
        </select>
        {Object.keys(edits).length > 0 && (
          <button className="btn-primary" onClick={saveAll} disabled={saving}>
            {saving ? 'Sauvegarde...' : `💾 Sauvegarder (${Object.keys(edits).length})`}
          </button>
        )}
        {message && <span className="pds-message">{message}</span>}
      </div>

      {/* Table by unit */}
      {Object.entries(grouped).map(([code, { nom, effectifs }]) => {
        const unitValides = effectifs.filter(e => e.valide).length
        const unitTotal = effectifs.length
        return (
          <div key={code} className="pds-unite-section">
            <h2 className="pds-unite-title">
              {code} — {nom}
              <span className="pds-unite-stats">
                {unitValides}/{unitTotal} validés
              </span>
            </h2>
            <table className="pds-table">
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Nom</th>
                  <th>Fonction</th>
                  <th>Heures</th>
                  <th>Statut</th>
                  {effectifs.some(e => e.categorie === 'Sous-officier') && <th>Rapport SO</th>}
                  {canEditAll && <th>Notes</th>}
                </tr>
              </thead>
              <tbody>
                {effectifs.map(eff => {
                  const edited = edits[eff.id] || {}
                  const heures = edited.heures !== undefined ? edited.heures : (eff.heures ?? '')
                  const rapportFait = edited.rapport_so_fait !== undefined ? edited.rapport_so_fait : !!eff.rapport_so_fait
                  const isSO = eff.categorie === 'Sous-officier' || eff.categorie === 'Officier'
                  const canEditThis = canEditAll || (myEffectifId && myEffectifId === eff.id)
                  const isMe = myEffectifId && myEffectifId === eff.id
                  
                  return (
                    <tr key={eff.id} className={`${eff.valide ? 'row-valid' : heures === '' ? 'row-empty' : 'row-invalid'} ${isMe ? 'row-me' : ''}`}>
                      <td className="td-grade">{eff.grade_nom || '—'}</td>
                      <td className="td-name">{eff.prenom} {eff.nom} {isMe && <span className="badge-me">MOI</span>}</td>
                      <td className="td-fonction">{eff.fonction || '—'}</td>
                      <td className="td-heures">
                        {canEditThis ? (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="168"
                            value={heures}
                            onChange={e => handleEdit(eff.id, 'heures', e.target.value)}
                            className="input-heures"
                            placeholder="0"
                          />
                        ) : (
                          <span>{eff.heures !== null ? `${eff.heures}h` : '—'}</span>
                        )}
                      </td>
                      <td className="td-status">
                        {eff.heures === null && !edited.heures ? '⬜' : eff.valide || parseFloat(heures) >= 6 ? '✅' : '❌'}
                      </td>
                      {effectifs.some(e => e.categorie === 'Sous-officier') && (
                        <td className="td-rapport">
                          {isSO ? (
                            canEditThis ? (
                              <input
                                type="checkbox"
                                checked={rapportFait}
                                onChange={e => handleEdit(eff.id, 'rapport_so_fait', e.target.checked)}
                              />
                            ) : (
                              rapportFait ? '✅' : '❌'
                            )
                          ) : '—'}
                        </td>
                      )}
                      {canEditAll && (
                        <td className="td-notes">
                          <input
                            type="text"
                            value={edited.notes !== undefined ? edited.notes : (eff.notes || '')}
                            onChange={e => handleEdit(eff.id, 'notes', e.target.value)}
                            className="input-notes"
                            placeholder="..."
                          />
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

      {filtered.length === 0 && <p className="pds-empty">Aucun effectif trouvé pour ces filtres.</p>}
    </div>
  )
}
