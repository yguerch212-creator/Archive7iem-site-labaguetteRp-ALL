import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'

export default function DescriptionPersonnelle() {
  const { user } = useAuth()
  const [effectifId, setEffectifId] = useState('')
  const [effectifNom, setEffectifNom] = useState('')
  const [data, setData] = useState(null)
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  const canEdit = user?.isAdmin || user?.isRecenseur || user?.unite_code === '916S'

  const loadEffectif = async (id) => {
    try {
      const res = await api.get(`/effectifs/${id}`)
      const e = res.data.data || res.data
      setData({
        taille_cm: e.taille_cm || '',
        gestalt: e.gestalt || '',
        gesicht: e.gesicht || '',
        haar: e.haar || '',
        bart: e.bart || '',
        augen: e.augen || '',
        besondere_kennzeichen: e.besondere_kennzeichen || '',
        blutgruppe: e.blutgruppe || '',
        gasmaskengroesse: e.gasmaskengroesse || '',
        schuhzeuglaenge: e.schuhzeuglaenge || '',
      })
    } catch { setMessage({ type: 'error', text: 'Effectif introuvable' }) }
  }

  const save = async () => {
    if (!effectifId || !data) return
    setSaving(true)
    try {
      await api.put(`/medical-soldbuch/sync-physique/${effectifId}`, data)
      setMessage({ type: 'success', text: 'Description mise à jour ✓ — synchronisée avec le Soldbuch' })
      setTimeout(() => setMessage(null), 4000)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
    setSaving(false)
  }

  const Field = ({ label, field, placeholder, type = 'text' }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input type={type} className="form-input" value={data?.[field] || ''} onChange={e => setData(d => ({ ...d, [field]: e.target.value }))} placeholder={placeholder} disabled={!canEdit} />
    </div>
  )

  return (
    <div className="container">
      <BackButton label="← Service médical" to="/medical" />
      <h1 style={{ textAlign: 'center', margin: 'var(--space-lg) 0' }}>📏 Description personnelle</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)', fontSize: '0.85rem' }}>
        Personalbeschreibung — Données physiques synchronisées avec le Soldbuch
      </p>

      {message && <div className={`alert alert-${message.type}`} style={{ marginBottom: 'var(--space-md)' }}>{message.text}</div>}

      <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
        <label className="form-label">Sélectionner un effectif</label>
        <EffectifAutocomplete
          value={effectifNom}
          onChange={(text) => setEffectifNom(text)}
          onSelect={eff => { setEffectifId(eff.id); setEffectifNom(`${eff.prenom} ${eff.nom}`); loadEffectif(eff.id) }}
          placeholder="Rechercher un effectif..."
        />
      </div>

      {data && (
        <div className="paper-card">
          <h3 style={{ marginTop: 0 }}>Données physiques — {effectifNom}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
            <Field label="Taille (cm)" field="taille_cm" placeholder="180" type="number" />
            <Field label="Corpulence" field="gestalt" placeholder="Mince, Normal, Fort..." />
            <Field label="Visage" field="gesicht" placeholder="Ovale, Rond, Carré..." />
            <Field label="Cheveux" field="haar" placeholder="Blond, Brun, Noir..." />
            <Field label="Barbe" field="bart" placeholder="Rasé, Moustache..." />
            <Field label="Yeux" field="augen" placeholder="Bleus, Bruns, Verts..." />
            <Field label="Groupe sanguin" field="blutgruppe" placeholder="A+, O-, AB+..." />
            <Field label="Taille masque à gaz" field="gasmaskengroesse" placeholder="1, 2, 3..." />
            <Field label="Pointure" field="schuhzeuglaenge" placeholder="42, 43..." />
          </div>
          <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
            <label className="form-label">Signes particuliers</label>
            <textarea className="form-input" rows={2} value={data.besondere_kennzeichen || ''} onChange={e => setData(d => ({ ...d, besondere_kennzeichen: e.target.value }))} placeholder="Cicatrice, tatouage, marque de naissance..." disabled={!canEdit} />
          </div>
          {canEdit && (
            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 'var(--space-md)' }}>
              {saving ? '⏳ Enregistrement...' : '✓ Enregistrer & synchroniser avec le Soldbuch'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
