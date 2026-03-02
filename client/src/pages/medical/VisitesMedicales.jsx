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
  test_vue: '', test_ouie: '', test_cardio: '', test_reflex: '', commentaire: ''
}

export default function VisitesMedicales() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const effectifFilter = searchParams.get('effectif')
  const [visites, setVisites] = useState([])
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1')
  const [message, setMessage] = useState(null)
  const [filterAptitude, setFilterAptitude] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ ...defaultForm, medecin: user?.username || '' })

  const canCreate = user?.isAdmin || user?.isRecenseur || user?.unite_code === '916S'
  const [effectifInfo, setEffectifInfo] = useState(null)

  useEffect(() => { load() }, [])

  // Load effectif info if filtered
  useEffect(() => {
    if (effectifFilter) {
      api.get(`/effectifs/${effectifFilter}`).then(r => setEffectifInfo(r.data.data || r.data)).catch(() => {})
    }
  }, [effectifFilter])

  const load = async () => {
    try {
      const res = await api.get('/medical')
      setVisites(res.data.data)
    } catch (err) { console.error(err) }
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      // Compute score_aptitude as average of 4 tests
      const vals = [form.test_reflex, form.test_cardio, form.test_vue, form.test_ouie].map(Number).filter(v => !isNaN(v) && v >= 0)
      const score = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : ''
      await api.post('/medical', { ...form, score_aptitude: score })
      setShowForm(false)
      setForm({ ...defaultForm, date_visite: new Date().toISOString().slice(0, 10), medecin: user?.username || '' })
      setMessage({ type: 'success', text: 'Visite médicale enregistrée ✓' })
      setTimeout(() => setMessage(null), 3000)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const fmtDate = d => {
    if (!d) return '—'
    try {
      const s = String(d).slice(0, 10)
      return new Date(s + 'T00:00').toLocaleDateString('fr-FR')
    } catch { return '—' }
  }

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

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-sm)' }}>🏥 {effectifFilter ? 'Dossier Médical' : 'Visites Médicales'}</h1>
      {effectifFilter && effectifInfo && (
        <div className="paper-card" style={{ textAlign: 'center', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', borderLeft: '3px solid var(--primary)' }}>
          <strong style={{ fontSize: '1.1rem' }}>{effectifInfo.prenom} {effectifInfo.nom}</strong>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {effectifInfo.grade_nom || '—'} — {effectifInfo.unite_nom || '—'}
          </div>
          {filtered.length === 0 && (
            <p style={{ margin: 'var(--space-md) 0 0', color: 'var(--text-muted)' }}>Aucune visite médicale enregistrée pour cet effectif.</p>
          )}
        </div>
      )}

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
                <input type="text" className="form-input" value={form.medecin} readOnly style={{ opacity: 0.7 }} />
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
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group"><label className="form-label">Test Réflexe</label><input type="number" min="0" max="20" className="form-input" value={form.test_reflex} onChange={e => setForm(p => ({...p, test_reflex: e.target.value}))} placeholder="/20" /></div>
              <div className="form-group"><label className="form-label">Test Cardio</label><input type="number" min="0" max="20" className="form-input" value={form.test_cardio} onChange={e => setForm(p => ({...p, test_cardio: e.target.value}))} placeholder="/20" /></div>
              <div className="form-group"><label className="form-label">Test Vue</label><input type="number" min="0" max="20" className="form-input" value={form.test_vue} onChange={e => setForm(p => ({...p, test_vue: e.target.value}))} placeholder="/20" /></div>
              <div className="form-group"><label className="form-label">Test Ouïe</label><input type="number" min="0" max="20" className="form-input" value={form.test_ouie} onChange={e => setForm(p => ({...p, test_ouie: e.target.value}))} placeholder="/20" /></div>
              <div className="form-group">
                <label className="form-label">Note globale (moyenne)</label>
                <input type="text" className="form-input" readOnly value={(() => {
                  const vals = [form.test_reflex, form.test_cardio, form.test_vue, form.test_ouie].map(Number).filter(v => !isNaN(v) && v >= 0)
                  return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) + '/20' : '—'
                })()} style={{ background: 'var(--bg-darker)', fontWeight: 600 }} />
              </div>
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
