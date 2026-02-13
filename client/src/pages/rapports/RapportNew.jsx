import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import apiClient from '../../api/client'

export default function RapportNew() {
  const navigate = useNavigate()
  const [unites, setUnites] = useState([])
  const [grades, setGrades] = useState([])
  const [effectifs, setEffectifs] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    type: 'rapport', titre: '', date_rp: '', date_irl: '',
    auteur_nom: '', auteur_id: '', unite_id: '', grade_id: '',
    contexte: '', resume: '', bilan: '', remarques: '',
    personne_renseignee_nom: '',
    // Recommandation
    recommande_nom: '', recommande_grade: '', raison_1: '', recompense: '',
    // Incident
    intro_nom: '', intro_grade: '', mise_en_cause_nom: '', mise_en_cause_grade: '',
    lieu_incident: '', compte_rendu: '',
    signature_nom: '', signature_grade: ''
  })

  useEffect(() => {
    apiClient.get('/unites').then(r => setUnites(r.data.data || []))
    apiClient.get('/effectifs/all').then(r => setEffectifs(r.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (form.unite_id) apiClient.get(`/unites/${form.unite_id}/grades`).then(r => setGrades(r.data.data || []))
    else setGrades([])
  }, [form.unite_id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await apiClient.post('/rapports', form)
      const id = res.data.data?.id
      if (id) navigate(`/rapports/${id}/layout`)
      else navigate('/rapports')
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur')
    }
  }

  return (
    <>
      
      <div className="container" style={{ maxWidth: 900 }}>
        <Link to="/rapports" className="btn btn-secondary btn-small">← Retour</Link>
        <h1 style={{ textAlign: 'center' }}>Nouveau Rapport</h1>

        {error && <div style={{ color: 'var(--error)', textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="paper-card">
          {/* Type selector */}
          <div className="form-group">
            <label className="form-label">Type de rapport *</label>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              {['rapport', 'recommandation', 'incident'].map(t => (
                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="radio" name="type" value={t} checked={form.type === t} onChange={() => set('type', t)} />
                  {t === 'rapport' ? '📋 Rapport journalier' : t === 'recommandation' ? '⭐ Recommandation' : '🚨 Incident'}
                </label>
              ))}
            </div>
          </div>

          {/* Common fields */}
          <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
            <div className="form-group"><label className="form-label">Titre *</label><input className="form-input" value={form.titre} onChange={e => set('titre', e.target.value)} required /></div>
            <div className="form-group">
              <label className="form-label">Auteur</label>
              <select className="form-select" value={form.auteur_id} onChange={e => { set('auteur_id', e.target.value); const eff = effectifs.find(x => x.id == e.target.value); if (eff) set('auteur_nom', `${eff.prenom} ${eff.nom}`) }}>
                <option value="">— Sélectionner ou saisir —</option>
                {effectifs.map(ef => <option key={ef.id} value={ef.id}>{ef.prenom} {ef.nom}</option>)}
              </select>
              <input className="form-input" style={{ marginTop: 4 }} placeholder="Ou saisir manuellement..." value={form.auteur_nom} onChange={e => set('auteur_nom', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
            <div className="form-group"><label className="form-label">Date RP *</label><input className="form-input" value={form.date_rp} onChange={e => set('date_rp', e.target.value)} placeholder="xx/xx/1944" required /></div>
            <div className="form-group"><label className="form-label">Date IRL *</label><input className="form-input" value={form.date_irl} onChange={e => set('date_irl', e.target.value)} placeholder="xx/xx/202x" required /></div>
          </div>

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

          {/* Type-specific fields */}
          {form.type === 'rapport' && (
            <>
              <div className="form-group"><label className="form-label">Contexte</label><textarea className="form-textarea" value={form.contexte} onChange={e => set('contexte', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Résumé *</label><textarea className="form-textarea" value={form.resume} onChange={e => set('resume', e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Bilan</label><textarea className="form-textarea" value={form.bilan} onChange={e => set('bilan', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Remarques</label><textarea className="form-textarea" value={form.remarques} onChange={e => set('remarques', e.target.value)} /></div>
            </>
          )}

          {form.type === 'recommandation' && (
            <>
              <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
                <div className="form-group"><label className="form-label">Personne recommandée *</label><input className="form-input" value={form.recommande_nom} onChange={e => set('recommande_nom', e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">Grade du recommandé</label><input className="form-input" value={form.recommande_grade} onChange={e => set('recommande_grade', e.target.value)} /></div>
              </div>
              <div className="form-group"><label className="form-label">Motifs *</label><textarea className="form-textarea" value={form.raison_1} onChange={e => set('raison_1', e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Récompense proposée</label><textarea className="form-textarea" value={form.recompense} onChange={e => set('recompense', e.target.value)} /></div>
            </>
          )}

          {form.type === 'incident' && (
            <>
              <h3>Rapporteur</h3>
              <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
                <div className="form-group"><label className="form-label">Nom</label><input className="form-input" value={form.intro_nom} onChange={e => set('intro_nom', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Grade</label><input className="form-input" value={form.intro_grade} onChange={e => set('intro_grade', e.target.value)} /></div>
              </div>
              <h3>Mise en cause</h3>
              <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
                <div className="form-group"><label className="form-label">Nom *</label><input className="form-input" value={form.mise_en_cause_nom} onChange={e => set('mise_en_cause_nom', e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">Grade</label><input className="form-input" value={form.mise_en_cause_grade} onChange={e => set('mise_en_cause_grade', e.target.value)} /></div>
              </div>
              <div className="form-group"><label className="form-label">Lieu de l'incident</label><input className="form-input" value={form.lieu_incident} onChange={e => set('lieu_incident', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Compte rendu *</label><textarea className="form-textarea" value={form.compte_rendu} onChange={e => set('compte_rendu', e.target.value)} required /></div>
            </>
          )}

          <h3>Signature</h3>
          <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
            <div className="form-group"><label className="form-label">Nom Prénom</label><input className="form-input" value={form.signature_nom} onChange={e => set('signature_nom', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Grade</label><input className="form-input" value={form.signature_grade} onChange={e => set('signature_grade', e.target.value)} /></div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
            <button className="btn btn-primary btn-large" type="submit">Créer le rapport</button>
          </div>
        </form>
      </div>
    </>
  )
}
