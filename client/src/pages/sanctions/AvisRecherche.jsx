import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'
import { exportToPdf } from '../../utils/exportPdf'

const STATUT_LABELS = { recherche: '🔴 RECHERCHÉ', capture: '🟢 CAPTURÉ', annule: '⚫ ANNULÉ' }
const STATUT_COLORS = { recherche: '#c0392b', capture: '#27ae60', annule: '#7f8c8d' }

export default function AvisRecherche() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState({
    nom: '', prenom: '', nationalite: 'Allemande', signalement: '', derniere_localisation: '',
    motifs: '', recompense: '', photo_url: '', photo_file: null, effectif_id: '', effectif_nom: ''
  })

  const canCreate = user?.isAdmin || user?.isOfficier || user?.groups?.includes('Feldgendarmerie')
  const isFeld = user?.isAdmin || user?.isOfficier || user?.groups?.includes('Feldgendarmerie')

  const load = async () => {
    try {
      const res = await api.get('/avis-recherche')
      setItems(res.data.data || [])
    } catch {}
  }
  useEffect(() => { load() }, [])

  const submit = async () => {
    try {
      if (form.photo_file) {
        const fd = new FormData()
        for (const [k, v] of Object.entries(form)) {
          if (k === 'photo_file') fd.append('photo', v)
          else fd.append(k, v)
        }
        await api.post('/avis-recherche', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        const { photo_file, ...payload } = form
        await api.post('/avis-recherche', payload)
      }
      setMessage({ type: 'success', text: 'Avis de recherche créé' })
      setShowForm(false)
      setForm({ nom: '', prenom: '', nationalite: 'Allemande', signalement: '', derniere_localisation: '', motifs: '', recompense: '', photo_url: '', photo_file: null, effectif_id: '', effectif_nom: '' })
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const updateStatut = async (id, statut) => {
    try {
      await api.put(`/avis-recherche/${id}/statut`, { statut })
      load()
      if (selected?.id === id) setSelected(s => ({ ...s, statut }))
    } catch {}
  }

  const deleteAvis = async (id) => {
    if (!confirm('Supprimer cet avis de recherche ?')) return
    try {
      await api.delete(`/avis-recherche/${id}`)
      setSelected(null)
      load()
    } catch {}
  }

  const getPhoto = (item) => {
    if (item.photo_url) return item.photo_url
    if (item.effectif_photo) return item.effectif_photo
    return null
  }

  // ─── Avis View ───
  if (selected) {
    const a = selected
    const photo = getPhoto(a)
    return (
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <BackButton onClick={() => setSelected(null)} label="← Avis de recherche" />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-small" onClick={() => exportToPdf('avis-recherche-doc', `Avis_${a.nom}_${a.prenom || ''}`)}>📄 PDF</button>
            {isFeld && a.statut === 'recherche' && <button className="btn btn-small" style={{ background: '#27ae60', color: 'white' }} onClick={() => updateStatut(a.id, 'capture')}>✅ Capturé</button>}
            {isFeld && a.statut === 'recherche' && <button className="btn btn-secondary btn-small" onClick={() => updateStatut(a.id, 'annule')}>❌ Annuler</button>}
            {isFeld && <button className="btn btn-danger btn-small" onClick={() => deleteAvis(a.id)}>🗑️</button>}
          </div>
        </div>

        <div id="avis-recherche-doc" className="paper-card" style={{ maxWidth: 600, margin: '0 auto', padding: 'var(--space-xl)', fontFamily: "'Courier New', monospace", border: '3px double #8b0000', position: 'relative' }}>
          {/* Watermark */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', fontSize: '4rem', opacity: 0.04, fontWeight: 900, color: '#8b0000', pointerEvents: 'none', whiteSpace: 'nowrap' }}>FELDGENDARMERIE</div>

          <h2 style={{ textAlign: 'center', color: '#8b0000', margin: '0 0 var(--space-sm)', fontSize: '1.3rem', letterSpacing: 2 }}>⚠️ AVIS DE RECHERCHE ⚠️</h2>

          {photo && (
            <div style={{ textAlign: 'center', margin: 'var(--space-md) 0' }}>
              <img src={photo} alt="Photo" style={{ width: 150, height: 180, objectFit: 'cover', border: '2px solid #333', borderRadius: 4 }} />
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: 'var(--space-md) 0' }}>
            <tbody>
              <tr><td style={{ fontWeight: 700, padding: '4px 8px', width: '40%', borderBottom: '1px solid #ccc' }}>Nom :</td><td style={{ padding: '4px 8px', borderBottom: '1px solid #ccc', fontWeight: 700, fontSize: '1.1rem' }}>{a.prenom ? `${a.prenom} ` : ''}{a.nom}</td></tr>
              <tr><td style={{ fontWeight: 700, padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Nationalité :</td><td style={{ padding: '4px 8px', borderBottom: '1px solid #ccc' }}>{a.nationalite || 'Allemande'}</td></tr>
              <tr><td style={{ fontWeight: 700, padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Statut :</td><td style={{ padding: '4px 8px', borderBottom: '1px solid #ccc', fontWeight: 700, color: STATUT_COLORS[a.statut] }}>{STATUT_LABELS[a.statut]}</td></tr>
            </tbody>
          </table>

          <div style={{ borderTop: '2px solid #333', margin: 'var(--space-md) 0' }} />

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem' }}>Signalement :</h4>
            <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{a.signalement || 'Aucune information confirmée concernant son apparence physique ou ses signes distinctifs.'}</p>
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem' }}>Dernière localisation connue :</h4>
            <p style={{ margin: 0, fontSize: '0.82rem' }}>{a.derniere_localisation || 'Inconnue.'}</p>
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem' }}>Motifs de recherche :</h4>
            <p style={{ margin: 0, fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{a.motifs || 'Infraction au code pénal allemand.'}</p>
          </div>

          {a.recompense && (
            <>
              <div style={{ borderTop: '2px solid #333', margin: 'var(--space-md) 0' }} />
              <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.1rem', color: '#8b0000', margin: 'var(--space-md) 0' }}>
                💰 RÉCOMPENSE : {a.recompense} 💰
              </p>
            </>
          )}

          <div style={{ borderTop: '2px solid #333', margin: 'var(--space-md) 0' }} />

          <p style={{ fontSize: '0.8rem', lineHeight: 1.6, margin: '0 0 var(--space-md)' }}>
            Toute personne disposant d'informations permettant d'identifier ou de localiser cet individu est invitée à les transmettre immédiatement.
          </p>

          <div style={{ background: 'rgba(139,0,0,0.06)', border: '1px solid rgba(139,0,0,0.2)', borderRadius: 4, padding: '8px 12px', marginBottom: 'var(--space-md)' }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#8b0000' }}>Consignes importantes :</h4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8rem', lineHeight: 1.6 }}>
              <li>Ne pas tenter d'intervenir seul.</li>
              <li>Faire preuve de discrétion.</li>
              <li><strong>Si l'individu est aperçu ou identifié, contacter immédiatement la Feldgendarmerie.</strong></li>
            </ul>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', fontStyle: 'italic', margin: 0, color: 'var(--text-muted)' }}>
            📜 Toute information, même mineure, peut s'avérer décisive.
          </p>

          <p style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', margin: 'var(--space-md) 0 0' }}>
            Émis par : {a.createur_nom || 'Feldgendarmerie'} — {new Date(a.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>
    )
  }

  // ─── List View ───
  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <BackButton label="← Justice militaire" />
        <h2 style={{ margin: 0 }}>🔍 Avis de recherche</h2>
        {canCreate && <button className="btn" onClick={() => setShowForm(true)}>+ Nouvel avis</button>}
      </div>

      {message && <div className={`alert alert-${message.type}`} style={{ marginBottom: 'var(--space-md)' }}>{message.text}</div>}

      {/* Form */}
      {showForm && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-xl)' }}>
          <h3>Nouvel avis de recherche</h3>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">Effectif (si existant)</label>
              <EffectifAutocomplete
                value={form.effectif_nom}
                onChange={(id, nom) => setForm(p => ({ ...p, effectif_id: id || '', effectif_nom: nom || '', nom: nom?.split(' ').pop() || p.nom, prenom: nom?.split(' ').slice(0, -1).join(' ') || p.prenom }))}
              />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
              <label className="form-label">Nom *</label>
              <input type="text" className="form-input" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Klaus" />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
              <label className="form-label">Prénom</label>
              <input type="text" className="form-input" value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} placeholder="Kleber" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
              <label className="form-label">Nationalité</label>
              <input type="text" className="form-input" value={form.nationalite} onChange={e => setForm(p => ({ ...p, nationalite: e.target.value }))} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
              <label className="form-label">Récompense</label>
              <input type="text" className="form-input" value={form.recompense} onChange={e => setForm(p => ({ ...p, recompense: e.target.value }))} placeholder="30 000 Reichsmark" />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
              <label className="form-label">Photo</label>
              <input type="file" accept="image/*" className="form-input" onChange={e => {
                const file = e.target.files?.[0]
                if (file) setForm(p => ({ ...p, photo_file: file, photo_url: '' }))
              }} />
              <input type="text" className="form-input" style={{ marginTop: 4 }} value={form.photo_url} onChange={e => setForm(p => ({ ...p, photo_url: e.target.value, photo_file: null }))} placeholder="...ou coller une URL" disabled={!!form.photo_file} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Signalement</label>
            <textarea className="form-input" rows={3} value={form.signalement} onChange={e => setForm(p => ({ ...p, signalement: e.target.value }))} placeholder="Description physique, signes distinctifs..." />
          </div>
          <div className="form-group">
            <label className="form-label">Dernière localisation connue</label>
            <input type="text" className="form-input" value={form.derniere_localisation} onChange={e => setForm(p => ({ ...p, derniere_localisation: e.target.value }))} placeholder="Secteur, ville..." />
          </div>
          <div className="form-group">
            <label className="form-label">Motifs de recherche</label>
            <textarea className="form-input" rows={3} value={form.motifs} onChange={e => setForm(p => ({ ...p, motifs: e.target.value }))} placeholder="Infraction au code pénal allemand..." />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={submit}>📋 Émettre l'avis</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="paper-card">
        {items.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucun avis de recherche émis.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>N°</th><th>Nom</th><th>Statut</th><th>Motifs</th><th>Récompense</th><th>Date</th></tr>
            </thead>
            <tbody>
              {items.map(a => (
                <tr key={a.id} onClick={() => setSelected(a)} style={{ cursor: 'pointer' }}
                  className="table-row-hover">
                  <td>AR-{String(a.id).padStart(3, '0')}</td>
                  <td style={{ fontWeight: 700 }}>{a.prenom ? `${a.prenom} ` : ''}{a.nom}</td>
                  <td><span style={{ color: STATUT_COLORS[a.statut], fontWeight: 600, fontSize: '0.8rem' }}>{STATUT_LABELS[a.statut]}</span></td>
                  <td style={{ fontSize: '0.8rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.motifs || '—'}</td>
                  <td style={{ fontSize: '0.8rem' }}>{a.recompense || '—'}</td>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(a.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
