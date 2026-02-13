import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'
import { formatDate } from '../../utils/dates'
import './sanctions.css'

const GROUPE_LABELS = {
  1: 'Groupe 1 — Mineur',
  2: 'Groupe 2 — Intermédiaire',
  3: 'Groupe 3 — Grave',
  4: 'Groupe 4 — Très grave',
  5: 'Groupe 5 — Capital'
}

const GROUPE_COLORS = {
  1: '#6b8f3c',
  2: '#b8860b',
  3: '#d2691e',
  4: '#c0392b',
  5: '#7b0000'
}

const STATUT_LABELS = {
  'En cours': '⏳ En cours',
  'Jugee': '⚖️ Jugée',
  'Classee': '📁 Classée',
  'Appel': '📜 Appel'
}

export default function Sanctions() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('liste')
  const [sanctions, setSanctions] = useState([])
  const [infractions, setInfractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGroupe, setFilterGroupe] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [selectedSanction, setSelectedSanction] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const canWrite = user?.isAdmin || user?.isOfficier || user?.isFeldgendarmerie

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, iRes] = await Promise.all([
        api.get('/sanctions'),
        api.get('/sanctions/infractions')
      ])
      setSanctions(sRes.data)
      setInfractions(iRes.data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = sanctions.filter(s => {
    if (filterGroupe && s.groupe_sanction !== parseInt(filterGroupe)) return false
    if (filterStatut && s.statut !== filterStatut) return false
    if (search) {
      const q = search.toLowerCase()
      const name = `${s.effectif_prenom} ${s.effectif_nom}`.toLowerCase()
      const inf = (s.infraction_nom || s.infraction_custom || '').toLowerCase()
      if (!name.includes(q) && !inf.includes(q) && !s.numero.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div className="container">
      <BackButton />
      <h1 className="page-title">⚖️ Sanctions & Casier Judiciaire</h1>
      <p className="page-subtitle">Code de Procédure Pénale Militaire — Guide des Infractions</p>

      <div className="sanctions-tabs">
        <button className={tab === 'liste' ? 'active' : ''} onClick={() => setTab('liste')}>
          📋 Sanctions ({sanctions.length})
        </button>
        <button className={tab === 'code' ? 'active' : ''} onClick={() => setTab('code')}>
          📖 Code Pénal
        </button>
        <button className={tab === 'accreditations' ? 'active' : ''} onClick={() => setTab('accreditations')}>
          🏛️ Accréditations
        </button>
      </div>

      {tab === 'liste' && (
        <div className="paper-card">
          <div className="sanctions-toolbar">
            <input
              type="text" placeholder="Rechercher (nom, n° sanction, infraction)..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="input-field"
            />
            <select value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)} className="input-field">
              <option value="">Tous les groupes</option>
              {[1,2,3,4,5].map(g => <option key={g} value={g}>Groupe {g}</option>)}
            </select>
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="input-field">
              <option value="">Tous les statuts</option>
              {Object.keys(STATUT_LABELS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {canWrite && (
              <button className="btn btn-primary" onClick={() => { setSelectedSanction(null); setShowForm(true) }}>
                + Nouvelle Sanction
              </button>
            )}
          </div>

          {loading ? <p>Chargement...</p> : filtered.length === 0 ? (
            <p className="empty-state">Aucune sanction enregistrée</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Effectif</th>
                  <th>Infraction</th>
                  <th>Groupe</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="clickable-row" onClick={() => { setSelectedSanction(s); setShowForm(false) }}>
                    <td className="mono">{s.numero}</td>
                    <td>{s.effectif_prenom} {s.effectif_nom}</td>
                    <td>{s.infraction_nom || s.infraction_custom || '—'}</td>
                    <td>
                      <span className="groupe-badge" style={{ background: GROUPE_COLORS[s.groupe_sanction] }}>
                        {s.groupe_sanction}
                      </span>
                    </td>
                    <td>{STATUT_LABELS[s.statut] || s.statut}</td>
                    <td>{s.date_irl ? formatDate(s.date_irl) : s.date_rp || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'code' && <CodePenal infractions={infractions} />}
      {tab === 'accreditations' && <Accreditations />}

      {selectedSanction && !showForm && (
        <SanctionPopup
          sanction={selectedSanction}
          canWrite={canWrite}
          onClose={() => setSelectedSanction(null)}
          onEdit={() => setShowForm(true)}
          onDelete={async () => {
            if (!confirm('Supprimer cette sanction ?')) return
            await api.delete(`/sanctions/${selectedSanction.id}`)
            setSelectedSanction(null)
            load()
          }}
          isAdmin={user?.isAdmin}
        />
      )}

      {showForm && (
        <SanctionForm
          sanction={selectedSanction}
          infractions={infractions}
          onClose={() => { setShowForm(false); setSelectedSanction(null) }}
          onSaved={() => { setShowForm(false); setSelectedSanction(null); load() }}
        />
      )}
    </div>
  )
}

function CodePenal({ infractions }) {
  const grouped = {}
  infractions.forEach(i => {
    if (!grouped[i.groupe]) grouped[i.groupe] = []
    grouped[i.groupe].push(i)
  })

  return (
    <div className="paper-card code-penal">
      <h2>📖 Code de Procédure Pénale Militaire</h2>
      <div className="code-intro">
        <p>Le Guide des infractions régit les lois et la doctrine militaire au sein de l'armée de la Wehrmacht. 
        Il fait office de règlement général et permet une application immédiate de la justice.</p>
        <p><em>Document repris et édité du Général Kris Fuhuerwehrmann</em></p>
      </div>

      {[1,2,3,4,5].map(g => (
        <div key={g} className="groupe-section">
          <h3 style={{ color: GROUPE_COLORS[g] }}>
            {GROUPE_LABELS[g]} — Niveau {6 - g}
          </h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Infraction</th>
                <th>Description</th>
                <th>Récidive</th>
              </tr>
            </thead>
            <tbody>
              {(grouped[g] || []).map(i => (
                <tr key={i.id}>
                  <td><strong>{i.nom}</strong></td>
                  <td>{i.description}</td>
                  <td>{i.groupe_recidive || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function Accreditations() {
  return (
    <div className="paper-card">
      <h2>🏛️ Accréditations au sein de la Feldgendarmerie</h2>
      <table className="data-table accred-table">
        <thead>
          <tr><th>Grade</th><th>Niveaux autorisés</th><th>Groupes de sanction</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Officiers</strong></td>
            <td>Niveau 1 à 5</td>
            <td>
              {[1,2,3,4,5].map(g => (
                <span key={g} className="groupe-badge" style={{ background: GROUPE_COLORS[g] }}>{g}</span>
              ))}
            </td>
          </tr>
          <tr>
            <td><strong>Sous-Officiers</strong></td>
            <td>Niveau 1 à 3</td>
            <td>
              {[1,2,3].map(g => (
                <span key={g} className="groupe-badge" style={{ background: GROUPE_COLORS[g] }}>{g}</span>
              ))}
            </td>
          </tr>
          <tr>
            <td><strong>Hommes du Rang</strong></td>
            <td>Niveau 1 à 2</td>
            <td>
              {[1,2].map(g => (
                <span key={g} className="groupe-badge" style={{ background: GROUPE_COLORS[g] }}>{g}</span>
              ))}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="accred-note">
        <p>⚠️ Les infractions de groupe 3 et supérieur doivent être sanctionnées sous réserve de l'autorité 
        du commandant de corps ou de son adjoint.</p>
      </div>
    </div>
  )
}

function SanctionPopup({ sanction: s, canWrite, onClose, onEdit, onDelete, isAdmin }) {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content sanction-detail" onClick={e => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>✕</button>
        <h2>
          <span className="groupe-badge" style={{ background: GROUPE_COLORS[s.groupe_sanction] }}>
            Groupe {s.groupe_sanction}
          </span>
          {' '}{s.numero}
        </h2>

        <div className="sanction-detail-grid">
          <div><label>Accusé</label><span>{s.effectif_prenom} {s.effectif_nom}</span></div>
          <div><label>Effectif ID</label><span>#{s.effectif_id}</span></div>
          <div><label>Infraction</label><span>{s.infraction_nom || s.infraction_custom || '—'}</span></div>
          <div><label>Statut</label><span>{STATUT_LABELS[s.statut]}</span></div>
          <div><label>Date RP</label><span>{s.date_rp || '—'}</span></div>
          <div><label>Date IRL</label><span>{s.date_irl ? formatDate(s.date_irl) : '—'}</span></div>
          <div><label>Lieu</label><span>{s.lieu || '—'}</span></div>
          <div><label>Agent verbalisateur</label><span>{s.agent_nom || '—'}</span></div>
          <div><label>Récidive</label><span>{s.recidive ? '⚠️ Oui' : 'Non'}</span></div>
          <div><label>Créé par</label><span>{s.created_by_username}</span></div>
        </div>

        <div className="sanction-desc">
          <label>Description de l'incident</label>
          <p>{s.description}</p>
        </div>

        {s.sanction_appliquee && (
          <div className="sanction-desc">
            <label>Sanction appliquée</label>
            <p>{s.sanction_appliquee}</p>
          </div>
        )}

        {s.notes_internes && canWrite && (
          <div className="sanction-desc notes-internes">
            <label>🔒 Notes internes</label>
            <p>{s.notes_internes}</p>
          </div>
        )}

        <div className="popup-actions">
          {canWrite && <button className="btn btn-primary" onClick={onEdit}>✏️ Modifier</button>}
          {isAdmin && <button className="btn btn-danger" onClick={onDelete}>🗑️ Supprimer</button>}
          <button className="btn" onClick={() => window.open(`/dossiers/effectif/${s.effectif_id}`, '_blank')}>
            📁 Voir dossier
          </button>
        </div>
      </div>
    </div>
  )
}

function SanctionForm({ sanction, infractions, onClose, onSaved }) {
  const [form, setForm] = useState({
    effectif_id: sanction?.effectif_id || '',
    effectif_display: sanction ? `${sanction.effectif_prenom} ${sanction.effectif_nom}` : '',
    infraction_id: sanction?.infraction_id || '',
    infraction_custom: sanction?.infraction_custom || '',
    groupe_sanction: sanction?.groupe_sanction || 1,
    description: sanction?.description || '',
    sanction_appliquee: sanction?.sanction_appliquee || '',
    date_rp: sanction?.date_rp || '',
    date_irl: sanction?.date_irl || new Date().toISOString().split('T')[0],
    lieu: sanction?.lieu || '',
    agent_id: sanction?.agent_id || '',
    agent_display: sanction?.agent_nom || '',
    agent_nom: sanction?.agent_nom || '',
    statut: sanction?.statut || 'En cours',
    recidive: sanction?.recidive || false,
    notes_internes: sanction?.notes_internes || ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleInfractionChange = (id) => {
    const inf = infractions.find(i => i.id === parseInt(id))
    setForm(f => ({
      ...f,
      infraction_id: id,
      infraction_custom: '',
      groupe_sanction: inf ? inf.groupe : f.groupe_sanction
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.effectif_id || !form.description) {
      setError('Effectif et description requis')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        ...form,
        infraction_id: form.infraction_id || null,
        agent_nom: form.agent_display || form.agent_nom
      }
      delete payload.effectif_display
      delete payload.agent_display

      if (sanction) {
        await api.put(`/sanctions/${sanction.id}`, payload)
      } else {
        await api.post('/sanctions', payload)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    }
    setSubmitting(false)
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content sanction-form-popup" onClick={e => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>✕</button>
        <h2>{sanction ? `Modifier ${sanction.numero}` : '⚖️ Nouvelle Sanction'}</h2>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label>Accusé *</label>
              <EffectifAutocomplete
                value={form.effectif_display}
                onChange={(id, display) => setForm(f => ({ ...f, effectif_id: id, effectif_display: display }))}
                placeholder="Nom de l'effectif..."
              />
            </div>
            <div className="form-group">
              <label>Agent verbalisateur</label>
              <EffectifAutocomplete
                value={form.agent_display}
                onChange={(id, display) => setForm(f => ({ ...f, agent_id: id, agent_display: display, agent_nom: display }))}
                placeholder="Qui verbalise..."
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Infraction (Code Pénal)</label>
              <select value={form.infraction_id} onChange={e => handleInfractionChange(e.target.value)} className="input-field">
                <option value="">— Infraction hors code —</option>
                {infractions.map(i => (
                  <option key={i.id} value={i.id}>[Grp {i.groupe}] {i.nom}</option>
                ))}
              </select>
            </div>
            {!form.infraction_id && (
              <div className="form-group">
                <label>Infraction personnalisée</label>
                <input type="text" value={form.infraction_custom}
                  onChange={e => setForm(f => ({ ...f, infraction_custom: e.target.value }))}
                  className="input-field" placeholder="Intitulé de l'infraction..."
                />
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Groupe de sanction *</label>
              <select value={form.groupe_sanction} onChange={e => setForm(f => ({ ...f, groupe_sanction: parseInt(e.target.value) }))} className="input-field">
                {[1,2,3,4,5].map(g => <option key={g} value={g}>{GROUPE_LABELS[g]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Statut</label>
              <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} className="input-field">
                {Object.keys(STATUT_LABELS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description de l'incident *</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field" rows={4} placeholder="Détails de l'infraction commise..."
            />
          </div>

          <div className="form-group">
            <label>Sanction appliquée</label>
            <textarea value={form.sanction_appliquee} onChange={e => setForm(f => ({ ...f, sanction_appliquee: e.target.value }))}
              className="input-field" rows={2} placeholder="Peine prononcée..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date RP</label>
              <input type="text" value={form.date_rp} onChange={e => setForm(f => ({ ...f, date_rp: e.target.value }))}
                className="input-field" placeholder="Ex: 12 Juin 1944"
              />
            </div>
            <div className="form-group">
              <label>Date IRL</label>
              <input type="date" value={form.date_irl} onChange={e => setForm(f => ({ ...f, date_irl: e.target.value }))}
                className="input-field"
              />
            </div>
            <div className="form-group">
              <label>Lieu</label>
              <input type="text" value={form.lieu} onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))}
                className="input-field" placeholder="Lieu de l'infraction..."
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" checked={form.recidive} onChange={e => setForm(f => ({ ...f, recidive: e.target.checked }))} />
                ⚠️ Récidive
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>🔒 Notes internes (visibles uniquement par les autorisés)</label>
            <textarea value={form.notes_internes} onChange={e => setForm(f => ({ ...f, notes_internes: e.target.value }))}
              className="input-field" rows={2} placeholder="Notes confidentielles..."
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Enregistrement...' : sanction ? 'Modifier' : 'Enregistrer la sanction'}
            </button>
            <button type="button" className="btn" onClick={onClose}>Annuler</button>
          </div>
        </form>
      </div>
    </div>
  )
}
