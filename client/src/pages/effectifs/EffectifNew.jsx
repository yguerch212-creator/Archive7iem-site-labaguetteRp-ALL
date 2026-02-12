import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import apiClient from '../../api/client'
import Topbar from '../../components/layout/Topbar'

export default function EffectifNew() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [unites, setUnites] = useState([])
  const [grades, setGrades] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nom: '', prenom: '', surnom: '', unite_id: params.get('unite_id') || '',
    grade_id: '', specialite: '', date_naissance: '', lieu_naissance: '',
    nationalite: 'Allemande', taille_cm: '', arme_principale: '', arme_secondaire: '',
    equipement_special: '', tenue: '', historique: '', date_entree_ig: '', date_entree_irl: ''
  })

  useEffect(() => {
    apiClient.get('/unites').then(r => setUnites(r.data.data || []))
  }, [])

  useEffect(() => {
    if (form.unite_id) {
      apiClient.get(`/unites/${form.unite_id}/grades`).then(r => setGrades(r.data.data || []))
    } else {
      setGrades([])
    }
  }, [form.unite_id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await apiClient.post('/effectifs', form)
      navigate(`/effectifs/unite/${form.unite_id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur')
    }
  }

  return (
    <>
      <Topbar />
      <div className="container" style={{ maxWidth: 800, marginTop: 'var(--space-xl)' }}>
        <Link to={form.unite_id ? `/effectifs/unite/${form.unite_id}` : '/effectifs'} className="btn btn-secondary btn-small">← Retour</Link>
        <h1 style={{ textAlign: 'center' }}>Nouvel Effectif</h1>

        {error && <div style={{ color: 'var(--error)', textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="paper-card">
          <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
            <div className="form-group"><label className="form-label">Nom *</label><input className="form-input" value={form.nom} onChange={e => set('nom', e.target.value)} required /></div>
            <div className="form-group"><label className="form-label">Prénom *</label><input className="form-input" value={form.prenom} onChange={e => set('prenom', e.target.value)} required /></div>
            <div className="form-group"><label className="form-label">Surnom</label><input className="form-input" value={form.surnom} onChange={e => set('surnom', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Nationalité</label><input className="form-input" value={form.nationalite} onChange={e => set('nationalite', e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">Unité *</label>
              <select className="form-select" value={form.unite_id} onChange={e => { set('unite_id', e.target.value); set('grade_id', '') }} required>
                <option value="">— Sélectionner —</option>
                {unites.map(u => <option key={u.id} value={u.id}>{u.code}. {u.nom}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Grade *</label>
              <select className="form-select" value={form.grade_id} onChange={e => set('grade_id', e.target.value)} required disabled={!form.unite_id}>
                <option value="">— Sélectionner —</option>
                {grades.map(g => <option key={g.id} value={g.id}>{g.nom_complet}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group"><label className="form-label">Spécialité</label><input className="form-input" value={form.specialite} onChange={e => set('specialite', e.target.value)} /></div>

          <div className="grid grid-cols-3" style={{ gap: 'var(--space-md)' }}>
            <div className="form-group"><label className="form-label">Date de naissance</label><input className="form-input" value={form.date_naissance} onChange={e => set('date_naissance', e.target.value)} placeholder="xx/xx/19xx" /></div>
            <div className="form-group"><label className="form-label">Lieu de naissance</label><input className="form-input" value={form.lieu_naissance} onChange={e => set('lieu_naissance', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Taille (cm)</label><input className="form-input" type="number" value={form.taille_cm} onChange={e => set('taille_cm', e.target.value)} /></div>
          </div>

          <h3>Équipement</h3>
          <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
            <div className="form-group"><label className="form-label">Arme principale</label><input className="form-input" value={form.arme_principale} onChange={e => set('arme_principale', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Arme secondaire</label><input className="form-input" value={form.arme_secondaire} onChange={e => set('arme_secondaire', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Équipement spécial</label><input className="form-input" value={form.equipement_special} onChange={e => set('equipement_special', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Tenue</label><input className="form-input" value={form.tenue} onChange={e => set('tenue', e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
            <div className="form-group"><label className="form-label">Date RP d'entrée</label><input className="form-input" value={form.date_entree_ig} onChange={e => set('date_entree_ig', e.target.value)} placeholder="xx/xx/1944" /></div>
            <div className="form-group"><label className="form-label">Date IRL d'entrée</label><input className="form-input" value={form.date_entree_irl} onChange={e => set('date_entree_irl', e.target.value)} placeholder="xx/xx/202x" /></div>
          </div>

          <div className="form-group"><label className="form-label">Historique</label><textarea className="form-textarea" value={form.historique} onChange={e => set('historique', e.target.value)} /></div>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
            <button className="btn btn-primary btn-large" type="submit">Enregistrer l'effectif</button>
          </div>
        </form>
      </div>
    </>
  )
}
