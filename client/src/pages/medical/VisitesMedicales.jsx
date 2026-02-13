import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'

const APTITUDES = ['Apte', 'Inapte temporaire', 'Inapte definitif', 'Apte avec reserves']
const APTITUDE_ICONS = { 'Apte': '🟢', 'Inapte temporaire': '🟡', 'Inapte definitif': '🔴', 'Apte avec reserves': '🟠' }

const defaultForm = {
  effectif_id: '', effectif_nom: '', date_visite: new Date().toISOString().slice(0, 10),
  medecin: '', diagnostic: '', aptitude: 'Apte', restrictions: '', notes_confidentielles: '',
  poids: '', imc: '', groupe_sanguin: '', allergenes: '', antecedents_medicaux: '', antecedents_psy: '',
  conso_drogue: '', conso_alcool: '', conso_tabac: '',
  test_vue: '', test_ouie: '', test_cardio: '', test_reflex: '', test_tir: '', score_aptitude: '', commentaire: ''
}

export default function VisitesMedicales() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const effectifFilter = searchParams.get('effectif')
  const [visites, setVisites] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)
  const [filterAptitude, setFilterAptitude] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ ...defaultForm })

  const canCreate = user?.isAdmin || user?.isRecenseur || user?.unite_code === '916S'

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await api.get('/medical')
      setVisites(res.data.data)
    } catch (err) { console.error(err) }
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/medical', form)
      setShowForm(false)
      setForm({ ...defaultForm, date_visite: new Date().toISOString().slice(0, 10) })
      setMessage({ type: 'success', text: 'Visite médicale enregistrée ✓' })
      setTimeout(() => setMessage(null), 3000)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const fmtDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('fr-FR') : '—'

  const filtered = visites.filter(v => {
    if (effectifFilter && v.effectif_id !== parseInt(effectifFilter)) return false
    if (filterAptitude && v.aptitude !== filterAptitude) return false
    if (search && !`${v.effectif_prenom} ${v.effectif_nom} ${v.medecin || ''}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton label="← Tableau de bord" />
        {canCreate && (
          <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Annuler' : '+ Nouvelle visite'}
          </button>
        )}
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>🏥 Visites Médicales</h1>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {showForm && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>Nouvelle visite médicale</h3>
          <form onSubmit={submit}>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
                <label className="form-label">Effectif *</label>
                <EffectifAutocomplete
                  value={form.effectif_nom}
                  onChange={(text, eff) => setForm(p => ({...p, effectif_nom: text, effectif_id: eff?.id || ''}))}
                  onSelect={eff => setForm(p => ({...p, effectif_id: eff.id, effectif_nom: `${eff.prenom} ${eff.nom}`}))}
                  placeholder="Rechercher un effectif..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date visite *</label>
                <input type="date" className="form-input" value={form.date_visite} onChange={e => setForm(p => ({...p, date_visite: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Aptitude</label>
                <select className="form-input" value={form.aptitude} onChange={e => setForm(p => ({...p, aptitude: e.target.value}))}>
                  {APTITUDES.map(a => <option key={a} value={a}>{APTITUDE_ICONS[a]} {a}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Médecin</label>
                <input type="text" className="form-input" value={form.medecin} onChange={e => setForm(p => ({...p, medecin: e.target.value}))} placeholder="Nom du médecin RP" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Restrictions</label>
                <input type="text" className="form-input" value={form.restrictions} onChange={e => setForm(p => ({...p, restrictions: e.target.value}))} placeholder="Repos, interdit arme lourde..." />
              </div>
            </div>
            {/* Fiche Patient */}
            <h4 style={{ margin: 'var(--space-md) 0 var(--space-sm)', borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>📋 Fiche Patient</h4>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group"><label className="form-label">Poids</label><input type="text" className="form-input" value={form.poids} onChange={e => setForm(p => ({...p, poids: e.target.value}))} placeholder="75 kg" /></div>
              <div className="form-group"><label className="form-label">IMC</label><input type="text" className="form-input" value={form.imc} onChange={e => setForm(p => ({...p, imc: e.target.value}))} placeholder="22.5" /></div>
              <div className="form-group"><label className="form-label">Groupe sanguin</label><input type="text" className="form-input" value={form.groupe_sanguin} onChange={e => setForm(p => ({...p, groupe_sanguin: e.target.value}))} placeholder="A+" /></div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Allergènes</label><input type="text" className="form-input" value={form.allergenes} onChange={e => setForm(p => ({...p, allergenes: e.target.value}))} placeholder="Aucun, pénicilline..." /></div>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Antécédents médicaux</label><input type="text" className="form-input" value={form.antecedents_medicaux} onChange={e => setForm(p => ({...p, antecedents_medicaux: e.target.value}))} placeholder="Fracture, chirurgie..." /></div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Antécédents psychologiques</label><input type="text" className="form-input" value={form.antecedents_psy} onChange={e => setForm(p => ({...p, antecedents_psy: e.target.value}))} placeholder="RAS..." /></div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group"><label className="form-label">Drogue</label><input type="text" className="form-input" value={form.conso_drogue} onChange={e => setForm(p => ({...p, conso_drogue: e.target.value}))} placeholder="Non" /></div>
              <div className="form-group"><label className="form-label">Alcool</label><input type="text" className="form-input" value={form.conso_alcool} onChange={e => setForm(p => ({...p, conso_alcool: e.target.value}))} placeholder="Occasionnel" /></div>
              <div className="form-group"><label className="form-label">Tabac</label><input type="text" className="form-input" value={form.conso_tabac} onChange={e => setForm(p => ({...p, conso_tabac: e.target.value}))} placeholder="Non" /></div>
            </div>

            {/* Tests */}
            <h4 style={{ margin: 'var(--space-md) 0 var(--space-sm)', borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>🏋️ Tests d'aptitude</h4>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group"><label className="form-label">Score global</label><input type="text" className="form-input" value={form.score_aptitude} onChange={e => setForm(p => ({...p, score_aptitude: e.target.value}))} placeholder="/10" /></div>
              <div className="form-group"><label className="form-label">Vue</label><input type="text" className="form-input" value={form.test_vue} onChange={e => setForm(p => ({...p, test_vue: e.target.value}))} placeholder="OK / Déficience..." /></div>
              <div className="form-group"><label className="form-label">Ouïe</label><input type="text" className="form-input" value={form.test_ouie} onChange={e => setForm(p => ({...p, test_ouie: e.target.value}))} placeholder="OK" /></div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group"><label className="form-label">Cardio (Squat)</label><input type="text" className="form-input" value={form.test_cardio} onChange={e => setForm(p => ({...p, test_cardio: e.target.value}))} placeholder="Temps..." /></div>
              <div className="form-group"><label className="form-label">Réflexe</label><input type="text" className="form-input" value={form.test_reflex} onChange={e => setForm(p => ({...p, test_reflex: e.target.value}))} placeholder="OK" /></div>
              <div className="form-group"><label className="form-label">Tir réussi/fail</label><input type="text" className="form-input" value={form.test_tir} onChange={e => setForm(p => ({...p, test_tir: e.target.value}))} placeholder="8/10" /></div>
            </div>

            <div className="form-group">
              <label className="form-label">Diagnostic</label>
              <textarea className="form-input" value={form.diagnostic} onChange={e => setForm(p => ({...p, diagnostic: e.target.value}))} rows={2} placeholder="Diagnostic médical..." style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Commentaire</label>
              <textarea className="form-input" value={form.commentaire} onChange={e => setForm(p => ({...p, commentaire: e.target.value}))} rows={2} placeholder="Recommandations..." style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" className="btn btn-primary">🏥 Enregistrer la visite</button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <input className="form-input" style={{ maxWidth: 250 }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-input" style={{ maxWidth: 200 }} value={filterAptitude} onChange={e => setFilterAptitude(e.target.value)}>
          <option value="">Toutes les aptitudes</option>
          {APTITUDES.map(a => <option key={a} value={a}>{APTITUDE_ICONS[a]} {a}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="paper-card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={th}>Aptitude</th>
              <th style={th}>Effectif</th>
              <th style={th}>Date visite</th>
              <th style={th}>Médecin</th>
              <th style={th}>Diagnostic</th>
              <th style={th}>Restrictions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>Aucune visite médicale</td></tr>
            ) : filtered.map(v => (
              <tr key={v.id} onClick={() => navigate(`/medical/${v.id}`)} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', background: v.aptitude === 'Inapte definitif' ? 'rgba(139,74,71,0.04)' : v.aptitude === 'Inapte temporaire' ? 'rgba(161,124,71,0.04)' : '' }} onMouseEnter={ev => ev.currentTarget.style.background = 'var(--military-light)'} onMouseLeave={ev => ev.currentTarget.style.background = ''}>
                <td style={td}><span style={{ whiteSpace: 'nowrap' }}>{APTITUDE_ICONS[v.aptitude]} {v.aptitude}</span></td>
                <td style={td}><strong>{v.effectif_grade ? `${v.effectif_grade} ` : ''}{v.effectif_prenom} {v.effectif_nom}</strong><br/><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.effectif_unite_code || ''}</span></td>
                <td style={td}>{fmtDate(v.date_visite)}</td>
                <td style={td}>{v.medecin || '—'}</td>
                <td style={{ ...td, maxWidth: 250 }}>{v.diagnostic || '—'}</td>
                <td style={td}>{v.restrictions || '—'}</td>
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
