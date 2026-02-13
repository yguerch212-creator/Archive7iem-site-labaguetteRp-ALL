import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import apiClient from '../../api/client'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'

const DRAFT_KEY = 'rapport_draft'

const TYPE_INFO = {
  rapport:        { icon: '📋', label: 'Rapport journalier', prefix: 'RJ' },
  recommandation: { icon: '⭐', label: 'Recommandation',     prefix: 'RC' },
  incident:       { icon: '🚨', label: 'Rapport d\'incident', prefix: 'IN' }
}

function loadDraft() {
  try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY)); return d && d.titre ? d : null } catch { return null }
}

export default function RapportNew() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [unites, setUnites] = useState([])
  const [grades, setGrades] = useState([])
  const [effectifs, setEffectifs] = useState([])
  const [error, setError] = useState('')
  const [hasDraft, setHasDraft] = useState(false)
  const [numero, setNumero] = useState('')

  const today = new Date().toLocaleDateString('fr-FR')
  const defaultForm = {
    type: 'rapport', titre: '', date_rp: '', date_irl: today,
    auteur_nom: user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : '',
    auteur_id: '', unite_id: user?.unite_id || '', grade_id: '',
    contexte: '', resume: '', bilan: '', remarques: '',
    personne_renseignee_nom: '',
    recommande_nom: '', recommande_grade: '', raison_1: '', recompense: '',
    intro_nom: '', intro_grade: '', mise_en_cause_nom: '', mise_en_cause_grade: '',
    lieu_incident: '', compte_rendu: '',
    signature_nom: user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : '',
    signature_grade: user?.grade_nom || ''
  }

  const [form, setForm] = useState(() => loadDraft() || defaultForm)

  // Auto-save draft
  const saveTimer = useRef(null)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (form.titre || form.resume || form.compte_rendu || form.raison_1) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
        setHasDraft(true)
      }
    }, 1000)
    return () => clearTimeout(saveTimer.current)
  }, [form])

  // Load data
  useEffect(() => {
    setHasDraft(!!loadDraft())
    apiClient.get('/unites').then(r => setUnites(r.data.data || []))
    apiClient.get('/effectifs/all').then(r => setEffectifs(r.data.data || [])).catch(() => {})
  }, [])

  // Fetch next number on type change
  useEffect(() => {
    apiClient.get('/rapports/next-number', { params: { type: form.type } })
      .then(r => setNumero(r.data.data?.numero || ''))
      .catch(() => {})
  }, [form.type])

  // Load grades on unite change
  useEffect(() => {
    if (form.unite_id) apiClient.get(`/unites/${form.unite_id}/grades`).then(r => setGrades(r.data.data || []))
    else setGrades([])
  }, [form.unite_id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // When picking an effectif from autocomplete, also set grade
  const handleAuteurPick = (text, eff) => {
    set('auteur_nom', text)
    if (eff) {
      set('auteur_id', eff.id)
      if (eff.unite_id) set('unite_id', eff.unite_id)
      if (eff.grade_id) set('grade_id', eff.grade_id)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await apiClient.post('/rapports', { ...form, numero })
      localStorage.removeItem(DRAFT_KEY)
      const id = res.data.data?.id
      if (id) navigate(`/rapports/${id}/layout`)
      else navigate('/rapports')
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur')
    }
  }

  const clearDraft = () => { localStorage.removeItem(DRAFT_KEY); setForm(defaultForm); setHasDraft(false) }

  const typeInfo = TYPE_INFO[form.type]

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <Link to="/rapports" className="btn-back">← Retour aux rapports</Link>
      <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Nouveau Rapport</h1>

      {numero && (
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1.5rem' }}>
          N° {numero}
        </p>
      )}

      {hasDraft && (
        <div style={{ textAlign: 'center', marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--military-accent)' }}>💾 Brouillon auto-sauvegardé</span>
          {' — '}
          <button onClick={clearDraft} style={{ background: 'none', border: 'none', color: 'var(--error, #c33)', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 'inherit' }}>
            Effacer le brouillon
          </button>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="paper-card">
        {/* Type selector — big buttons */}
        <div className="form-group">
          <label className="form-label">Type de rapport</label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {Object.entries(TYPE_INFO).map(([t, info]) => (
              <button
                key={t} type="button"
                onClick={() => set('type', t)}
                style={{
                  flex: 1, minWidth: 150, padding: '0.75rem',
                  background: form.type === t ? 'var(--military-green)' : 'transparent',
                  color: form.type === t ? '#fff' : 'var(--text)',
                  border: `2px solid ${form.type === t ? 'var(--military-green)' : 'var(--border)'}`,
                  borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
              >
                {info.icon} {info.label}
              </button>
            ))}
          </div>
        </div>

        {/* Common: Titre + Auteur */}
        <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
          <div className="form-group">
            <label className="form-label">Titre *</label>
            <input className="form-input" value={form.titre} onChange={e => set('titre', e.target.value)} required
              placeholder={form.type === 'rapport' ? 'Rapport du ...' : form.type === 'recommandation' ? 'Recommandation de ...' : 'Incident — ...'} />
          </div>
          <div className="form-group">
            <label className="form-label">Auteur</label>
            <EffectifAutocomplete
              effectifs={effectifs}
              value={form.auteur_nom}
              onChange={handleAuteurPick}
              placeholder="Rechercher ou saisir..."
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
          <div className="form-group">
            <label className="form-label">Date RP *</label>
            <input className="form-input" value={form.date_rp} onChange={e => set('date_rp', e.target.value)} placeholder="xx/xx/1944" required />
          </div>
          <div className="form-group">
            <label className="form-label">Date IRL</label>
            <input className="form-input" value={form.date_irl} onChange={e => set('date_irl', e.target.value)} placeholder={today} />
          </div>
        </div>

        {/* Unité + Grade */}
        <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
          <div className="form-group">
            <label className="form-label">Unité</label>
            <select className="form-select" value={form.unite_id} onChange={e => { set('unite_id', e.target.value); set('grade_id', '') }}>
              <option value="">— Sélectionner —</option>
              {unites.map(u => <option key={u.id} value={u.id}>{u.code}. {u.nom}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Grade</label>
            <select className="form-select" value={form.grade_id} onChange={e => set('grade_id', e.target.value)} disabled={!form.unite_id}>
              <option value="">— Sélectionner —</option>
              {grades.map(g => <option key={g.id} value={g.id}>{g.nom_complet}</option>)}
            </select>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed var(--border)', margin: '1.5rem 0' }} />

        {/* ===== RAPPORT JOURNALIER ===== */}
        {form.type === 'rapport' && (
          <>
            <div className="form-group">
              <label className="form-label">Contexte</label>
              <textarea className="form-textarea" rows={2} value={form.contexte} onChange={e => set('contexte', e.target.value)} placeholder="Contexte de la mission / opération..." />
            </div>
            <div className="form-group">
              <label className="form-label">Résumé *</label>
              <textarea className="form-textarea" rows={4} value={form.resume} onChange={e => set('resume', e.target.value)} required placeholder="Déroulement des événements..." />
            </div>
            <div className="form-group">
              <label className="form-label">Bilan</label>
              <textarea className="form-textarea" rows={2} value={form.bilan} onChange={e => set('bilan', e.target.value)} placeholder="Pertes, résultats, objectifs atteints..." />
            </div>
            <div className="form-group">
              <label className="form-label">Remarques</label>
              <textarea className="form-textarea" rows={2} value={form.remarques} onChange={e => set('remarques', e.target.value)} placeholder="Notes supplémentaires..." />
            </div>
          </>
        )}

        {/* ===== RECOMMANDATION ===== */}
        {form.type === 'recommandation' && (
          <>
            <h3 style={{ fontFamily: 'var(--font-mono)', margin: '0 0 1rem' }}>Soldat recommandé</h3>
            <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Nom *</label>
                <EffectifAutocomplete
                  effectifs={effectifs}
                  value={form.recommande_nom}
                  onChange={(text, eff) => {
                    set('recommande_nom', text)
                    if (eff?.grade_nom) set('recommande_grade', eff.grade_nom)
                  }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Grade</label>
                <input className="form-input" value={form.recommande_grade} onChange={e => set('recommande_grade', e.target.value)} placeholder="Auto-rempli si sélectionné" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Motifs de la recommandation *</label>
              <textarea className="form-textarea" rows={4} value={form.raison_1} onChange={e => set('raison_1', e.target.value)} required placeholder="Actes de bravoure, mérite, etc..." />
            </div>
            <div className="form-group">
              <label className="form-label">Récompense proposée</label>
              <textarea className="form-textarea" rows={2} value={form.recompense} onChange={e => set('recompense', e.target.value)} placeholder="Promotion, médaille, permission..." />
            </div>
          </>
        )}

        {/* ===== INCIDENT ===== */}
        {form.type === 'incident' && (
          <>
            <h3 style={{ fontFamily: 'var(--font-mono)', margin: '0 0 1rem' }}>Rapporteur</h3>
            <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Nom</label>
                <EffectifAutocomplete
                  effectifs={effectifs}
                  value={form.intro_nom}
                  onChange={(text, eff) => {
                    set('intro_nom', text)
                    if (eff?.grade_nom) set('intro_grade', eff.grade_nom)
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Grade</label>
                <input className="form-input" value={form.intro_grade} onChange={e => set('intro_grade', e.target.value)} />
              </div>
            </div>

            <h3 style={{ fontFamily: 'var(--font-mono)', margin: '1rem 0' }}>Mise en cause</h3>
            <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Nom *</label>
                <EffectifAutocomplete
                  effectifs={effectifs}
                  value={form.mise_en_cause_nom}
                  onChange={(text, eff) => {
                    set('mise_en_cause_nom', text)
                    if (eff?.grade_nom) set('mise_en_cause_grade', eff.grade_nom)
                  }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Grade</label>
                <input className="form-input" value={form.mise_en_cause_grade} onChange={e => set('mise_en_cause_grade', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Lieu de l'incident</label>
              <input className="form-input" value={form.lieu_incident} onChange={e => set('lieu_incident', e.target.value)} placeholder="Caserne, front, ville..." />
            </div>
            <div className="form-group">
              <label className="form-label">Compte rendu *</label>
              <textarea className="form-textarea" rows={5} value={form.compte_rendu} onChange={e => set('compte_rendu', e.target.value)} required placeholder="Description détaillée de l'incident..." />
            </div>
          </>
        )}

        <hr style={{ border: 'none', borderTop: '1px dashed var(--border)', margin: '1.5rem 0' }} />

        {/* Signature */}
        <h3 style={{ fontFamily: 'var(--font-mono)', margin: '0 0 1rem' }}>Signature</h3>
        <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
          <div className="form-group">
            <label className="form-label">Nom Prénom</label>
            <input className="form-input" value={form.signature_nom} onChange={e => set('signature_nom', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Grade</label>
            <input className="form-input" value={form.signature_grade} onChange={e => set('signature_grade', e.target.value)} />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
          <button className="btn btn-primary btn-large" type="submit">
            {typeInfo.icon} Créer le rapport
          </button>
        </div>
      </form>
    </div>
  )
}
