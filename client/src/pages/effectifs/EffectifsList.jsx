import BackButton from '../../components/BackButton'
import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import apiClient from '../../api/client'
import { formatDate } from '../../utils/dates'
import { exportCsv } from '../../utils/exportCsv'

export default function EffectifsList() {
  const { uniteId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [effectifs, setEffectifs] = useState([])
  const [unite, setUnite] = useState(null)
  const [unites, setUnites] = useState([])
  const [grades, setGrades] = useState([])
  const [filters, setFilters] = useState({ nom: '', grade: '', categorie: '' })
  const [selected, setSelected] = useState(null)
  const [regModal, setRegModal] = useState(null) // {type: 'transfer'|'dismiss', effectif}
  const [motif, setMotif] = useState('')
  const [toUnite, setToUnite] = useState('')
  const [severity, setSeverity] = useState('simple')
  const [flash, setFlash] = useState(null)

  const load = () => apiClient.get(`/effectifs?unite_id=${uniteId}`).then(r => setEffectifs(r.data.data || [])).catch(() => {})

  useEffect(() => {
    load()
    apiClient.get(`/unites/${uniteId}/grades`).then(r => setGrades(r.data.data || [])).catch(() => {})
    apiClient.get('/unites').then(r => {
      const all = r.data.data || r.data || []
      setUnites(all)
      const u = all.find(x => x.id == uniteId)
      setUnite(u)
    }).catch(() => {})
  }, [uniteId])

  const filtered = effectifs.filter(e => {
    if (filters.nom && !`${e.prenom} ${e.nom}`.toLowerCase().includes(filters.nom.toLowerCase())) return false
    if (filters.grade && e.grade_nom !== filters.grade) return false
    if (filters.categorie) {
      const rang = e.grade_rang || 0
      if (filters.categorie === 'Officier' && rang < 60) return false
      if (filters.categorie === 'Sous-officier' && (rang < 35 || rang >= 60)) return false
      if (filters.categorie === 'Militaire du rang' && rang >= 35) return false
    }
    return true
  })

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <BackButton className="btn btn-secondary btn-small" label="← Retour" />
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {user?.isAdmin && <button className="btn btn-secondary btn-small" onClick={() => exportCsv(filtered, [
            { key: 'prenom', label: 'Prénom' }, { key: 'nom', label: 'Nom' },
            { key: 'grade_nom', label: 'Grade' }, { key: 'categorie', label: 'Catégorie' },
            { key: 'fonction', label: 'Fonction' }, { key: 'specialite', label: 'Spécialité' },
            { key: r => formatDate(r.date_entree_irl), label: 'Entrée IRL' }
          ], `Effectifs_${unite?.code || 'all'}`)}>📥 CSV</button>}
          <Link to={`/effectifs/new?unite_id=${uniteId}`} className="btn btn-primary btn-small">+ Ajouter</Link>
        </div>
      </div>

      <h1 style={{ textAlign: 'center' }}>{unite ? `${unite.code}. ${unite.nom}` : 'Effectifs'}</h1>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <input
          className="form-input"
          style={{ maxWidth: 250, minWidth: 0, flex: '1 1 200px' }}
          placeholder="Nom / Prénom..."
          value={filters.nom}
          onChange={e => setFilters(f => ({ ...f, nom: e.target.value }))}
        />
        <select
          className="form-select"
          style={{ maxWidth: 200, minWidth: 0, flex: '1 1 150px' }}
          value={filters.grade}
          onChange={e => setFilters(f => ({ ...f, grade: e.target.value }))}
        >
          <option value="">— Grade —</option>
          {grades.map(g => <option key={g.id} value={g.nom_complet}>{g.nom_complet}</option>)}
        </select>
        <select
          className="form-select"
          style={{ maxWidth: 180, minWidth: 0, flex: '1 1 150px' }}
          value={filters.categorie}
          onChange={e => setFilters(f => ({ ...f, categorie: e.target.value }))}
        >
          <option value="">— Catégorie —</option>
          <option value="Officier">Officier</option>
          <option value="Sous-officier">Sous-officier</option>
          <option value="Militaire du rang">Militaire du rang</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="paper-card">
        <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={thStyle}>Prénom / Nom</th>
              <th style={thStyle}>Grade</th>
              <th style={thStyle}>Catégorie</th>
              <th style={thStyle}>Fonction</th>
              <th style={thStyle}>Spécialité</th>
              <th style={thStyle}>Entrée IRL</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>Aucun effectif</td></tr>
            ) : filtered.map(e => (
              <tr key={e.id} onClick={() => setSelected(e)} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={ev => ev.currentTarget.style.background = 'var(--military-light)'} onMouseLeave={ev => ev.currentTarget.style.background = ''}>
                <td style={tdStyle}><strong>{e.prenom} {e.nom}</strong>{e.en_reserve ? <span style={{ marginLeft: 6, fontSize: '0.65rem', background: '#8a7d6b', color: '#fff', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>RÉSERVE</span> : null}</td>
                <td style={tdStyle}>{e.grade_nom || '—'}</td>
                <td style={tdStyle}><span className={`badge ${e.categorie === 'Officier' ? 'badge-warning' : e.categorie === 'Sous-officier' ? 'badge-success' : 'badge-muted'}`}>{e.categorie || e.grade_categorie || '—'}</span></td>
                <td style={tdStyle}>{e.fonction || '—'}</td>
                <td style={tdStyle}>{e.specialite || '—'}</td>
                <td style={tdStyle}>{formatDate(e.date_entree_irl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Quick actions popup */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={ev => ev.stopPropagation()} style={{ background: 'var(--paper-bg)', border: '2px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: 'var(--space-xl)', maxWidth: 500, width: '90%', boxShadow: 'var(--shadow-heavy)' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 style={{ margin: '0 0 4px' }}>{selected.prenom} {selected.nom}</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{selected.grade_nom || '—'} — {selected.fonction || '—'}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-sm)' }}>
              <button className="paper-card unit-card" style={{ cursor: 'pointer', textAlign: 'center', padding: 'var(--space-lg)', border: '1px solid var(--border-color)' }} onClick={() => navigate(`/effectifs/${selected.id}/soldbuch`)}>
                <div style={{ fontSize: '2rem', marginBottom: 6 }}>📘</div>
                <strong>Soldbuch</strong>
              </button>
              <button className="paper-card unit-card" style={{ cursor: 'pointer', textAlign: 'center', padding: 'var(--space-lg)', border: '1px solid var(--border-color)' }} onClick={() => navigate(`/dossiers/effectif/${selected.id}`)}>
                <div style={{ fontSize: '2rem', marginBottom: 6 }}>📁</div>
                <strong>Dossier</strong>
              </button>
              <button className="paper-card unit-card" style={{ cursor: 'pointer', textAlign: 'center', padding: 'var(--space-lg)', border: '1px solid var(--border-color)' }} onClick={() => navigate(`/medical?effectif=${selected.id}`)}>
                <div style={{ fontSize: '2rem', marginBottom: 6 }}>🏥</div>
                <strong>Médical</strong>
              </button>
              <button className="paper-card unit-card" style={{ cursor: 'pointer', textAlign: 'center', padding: 'var(--space-lg)', border: '1px solid var(--border-color)' }} onClick={() => navigate(`/effectifs/${selected.id}/edit`)}>
                <div style={{ fontSize: '2rem', marginBottom: 6 }}>✏️</div>
                <strong>Modifier</strong>
              </button>
              <button className="paper-card unit-card" style={{ cursor: 'pointer', textAlign: 'center', padding: 'var(--space-lg)', border: '1px solid var(--border-color)' }} onClick={() => navigate(`/search?q=${encodeURIComponent(selected.prenom + ' ' + selected.nom)}`)}>
                <div style={{ fontSize: '2rem', marginBottom: 6 }}>🔎</div>
                <strong>Rechercher</strong>
              </button>
              {(user?.isAdmin || user?.isOfficier || user?.isRecenseur) && (
                <button className="paper-card unit-card" style={{ cursor: 'pointer', textAlign: 'center', padding: 'var(--space-lg)', border: '1px solid var(--border-color)', background: selected.en_reserve ? 'rgba(60,143,60,0.08)' : 'rgba(140,120,60,0.08)' }} onClick={async () => {
                  try {
                    await apiClient.put(`/effectifs/${selected.id}/reserve`)
                    setSelected(null); load()
                  } catch (err) { alert(err.response?.data?.message || 'Erreur') }
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 6 }}>{selected.en_reserve ? '🔄' : '🏕️'}</div>
                  <strong>{selected.en_reserve ? 'Sortir de réserve' : 'Mettre en réserve'}</strong>
                </button>
              )}
              {/* Transfer/Dismiss for officers of same regiment + admin/EM */}
              {(user?.isAdmin || user?.isEtatMajor || (user?.isOfficier && user?.unite_id == uniteId)) && (
                <>
                  <button className="paper-card unit-card" style={{ cursor: 'pointer', textAlign: 'center', padding: 'var(--space-lg)', border: '1px solid #c9a84c', background: 'rgba(201,168,76,0.08)' }}
                    onClick={() => { setRegModal({ type: 'transfer', effectif: selected }); setMotif(''); setToUnite('') }}>
                    <div style={{ fontSize: '2rem', marginBottom: 6 }}>🔄</div>
                    <strong>Transférer</strong>
                  </button>
                  <button className="paper-card unit-card" style={{ cursor: 'pointer', textAlign: 'center', padding: 'var(--space-lg)', border: '1px solid #8B0000', background: 'rgba(139,0,0,0.05)' }}
                    onClick={() => { setRegModal({ type: 'dismiss', effectif: selected }); setMotif(''); setSeverity('simple') }}>
                    <div style={{ fontSize: '2rem', marginBottom: 6 }}>🚪</div>
                    <strong style={{ color: '#8B0000' }}>Renvoyer</strong>
                  </button>
                </>
              )}
              {user?.isAdmin && (
                <button className="paper-card unit-card" style={{ cursor: 'pointer', textAlign: 'center', padding: 'var(--space-lg)', border: '1px solid var(--border-color)', background: 'rgba(180,40,40,0.05)' }} onClick={async () => {
                  if (!confirm(`Supprimer ${selected.prenom} ${selected.nom} ?`)) return
                  try {
                    await apiClient.delete(`/effectifs/${selected.id}`)
                    setEffectifs(prev => prev.filter(e => e.id !== selected.id))
                    setSelected(null)
                  } catch (err) { alert(err.response?.data?.message || 'Erreur') }
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 6 }}>🗑️</div>
                  <strong style={{ color: 'var(--danger)' }}>Supprimer</strong>
                </button>
              )}
            </div>
            <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
              <button className="btn btn-secondary btn-small" onClick={() => setSelected(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
      {/* Flash message */}
      {flash && <div className={`alert alert-${flash.type}`} style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 2000, maxWidth: 400 }}>{flash.text}</div>}

      {/* Transfer / Dismiss modal */}
      {regModal && (
        <div onClick={() => setRegModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--paper-bg)', border: `2px solid ${regModal.type === 'dismiss' ? '#8B0000' : '#8B7355'}`,
            borderRadius: 'var(--border-radius)', padding: 'var(--space-xl)',
            maxWidth: 460, width: '90%', boxShadow: 'var(--shadow-heavy)'
          }}>
            <h2 style={{ margin: '0 0 var(--space-sm)', textAlign: 'center', fontSize: '1.1rem', color: regModal.type === 'dismiss' ? '#8B0000' : 'inherit' }}>
              {regModal.type === 'transfer' ? '🔄 Transfert' : '🚪 Renvoi'}
            </h2>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 var(--space-md)' }}>
              {regModal.effectif.grade_nom || ''} {regModal.effectif.prenom} {regModal.effectif.nom}
            </p>

            {regModal.type === 'transfer' && (
              <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Unité de destination</label>
                <select className="form-input" value={toUnite} onChange={e => setToUnite(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {unites.filter(u => u.id != uniteId).map(u => <option key={u.id} value={u.id}>{u.code} — {u.nom}</option>)}
                </select>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Motif <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(min 10 car.)</span></label>
              <textarea className="form-input" value={motif} onChange={e => setMotif(e.target.value)}
                placeholder={regModal.type === 'transfer' ? 'Raison du transfert...' : 'Raison du renvoi...'}
                style={{ minHeight: 70, fontFamily: 'var(--font-mono)', background: '#faf3e0', resize: 'vertical' }} />
            </div>

            {regModal.type === 'dismiss' && (
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Sévérité</label>
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.8rem' }}>
                    <input type="radio" value="simple" checked={severity === 'simple'} onChange={() => setSeverity('simple')} /> Simple
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.8rem', color: '#8B0000' }}>
                    <input type="radio" value="definitive" checked={severity === 'definitive'} onChange={() => setSeverity('definitive')} /> Définitif
                  </label>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
              <button onClick={async () => {
                if (regModal.type === 'transfer') {
                  if (!toUnite || motif.length < 10) { setFlash({ type: 'error', text: 'Unité et motif (min 10) requis' }); setTimeout(() => setFlash(null), 3000); return }
                  try {
                    const { data } = await apiClient.post('/regiment/transfer', { effectif_id: regModal.effectif.id, to_unite_id: parseInt(toUnite), motif })
                    if (data.success) { setFlash({ type: 'success', text: data.message }); setRegModal(null); setSelected(null); load() }
                    else setFlash({ type: 'error', text: data.message })
                  } catch (e) { setFlash({ type: 'error', text: e.response?.data?.message || 'Erreur' }) }
                } else {
                  if (motif.length < 10) { setFlash({ type: 'error', text: 'Motif requis (min 10 car.)' }); setTimeout(() => setFlash(null), 3000); return }
                  if (!confirm(`Confirmer le renvoi de ${regModal.effectif.prenom} ${regModal.effectif.nom} ?`)) return
                  try {
                    const { data } = await apiClient.post('/regiment/dismiss', { effectif_id: regModal.effectif.id, motif, severity })
                    if (data.success) { setFlash({ type: 'success', text: data.message }); setRegModal(null); setSelected(null); load() }
                    else setFlash({ type: 'error', text: data.message })
                  } catch (e) { setFlash({ type: 'error', text: e.response?.data?.message || 'Erreur' }) }
                }
                setTimeout(() => setFlash(null), 4000)
              }} style={{
                background: regModal.type === 'transfer' ? 'linear-gradient(180deg,#c9a84c,#a88734)' : 'linear-gradient(180deg,#a83232,#6b1010)',
                color: regModal.type === 'transfer' ? '#1a1a1a' : '#f5ecd7',
                border: `1px solid ${regModal.type === 'transfer' ? '#8B7355' : '#5a0000'}`,
                padding: '8px 18px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                letterSpacing: '0.5px', cursor: 'pointer', borderRadius: 'var(--border-radius)', fontSize: '0.85rem'
              }}>Confirmer</button>
              <button className="btn btn-secondary" onClick={() => setRegModal(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)' }
const tdStyle = { padding: 'var(--space-sm) var(--space-md)' }
