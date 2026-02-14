import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import SignatureCanvas from '../../components/SignatureCanvas'

const TYPES = [
  { value: 'tampon', label: '🔴 Tampons', icon: '🔴' },
  { value: 'signature', label: '✒️ Signatures', icon: '✒️' },
  { value: 'template', label: '📄 Templates', icon: '📄' },
]

export default function Bibliotheque() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [unites, setUnites] = useState([])
  const [tab, setTab] = useState('tampon')
  const [showForm, setShowForm] = useState(false)
  const [showSignCanvas, setShowSignCanvas] = useState(false)
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState({ type: 'tampon', nom: '', description: '', unite_id: '', image_data: '' })
  const [preview, setPreview] = useState(null)
  const fileRef = useRef()

  const canCreate = user?.isAdmin || user?.isOfficier

  useEffect(() => {
    api.get('/unites').then(r => setUnites(r.data.data || r.data)).catch(() => {})
  }, [])

  useEffect(() => { load() }, [tab])

  const load = async () => {
    try {
      const res = await api.get('/bibliotheque', { params: { type: tab } })
      setItems(res.data.data)
    } catch (err) { console.error(err) }
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Seules les images sont acceptées (PNG, JPG)' })
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setForm(p => ({ ...p, image_data: ev.target.result }))
      setPreview(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSignatureSave = (dataUrl) => {
    setForm(p => ({ ...p, image_data: dataUrl, type: 'signature' }))
    setPreview(dataUrl)
    setShowSignCanvas(false)
    setTab('signature')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.image_data) {
      setMessage({ type: 'error', text: 'Image requise' })
      return
    }
    try {
      await api.post('/bibliotheque', form)
      setShowForm(false)
      setForm({ type: tab, nom: '', description: '', unite_id: '', image_data: '' })
      setPreview(null)
      setMessage({ type: 'success', text: 'Élément ajouté à la bibliothèque ✓' })
      setTimeout(() => setMessage(null), 3000)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cet élément ?')) return
    try {
      await api.delete(`/bibliotheque/${id}`)
      load()
    } catch (err) { alert('Erreur') }
  }

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton label="← Tableau de bord" />
        {canCreate && (
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button className="btn btn-primary btn-small" onClick={() => { setShowForm(!showForm); setShowSignCanvas(false) }}>
              {showForm ? '✕ Annuler' : '+ Ajouter'}
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => { setShowSignCanvas(!showSignCanvas); setShowForm(false) }}>
              {showSignCanvas ? '✕ Annuler' : '✒️ Dessiner signature'}
            </button>
          </div>
        )}
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>📚 Bibliothèque — Tampons & Signatures</h1>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', justifyContent: 'center' }}>
        {TYPES.map(t => (
          <button key={t.value} className={`btn btn-sm ${tab === t.value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Signature canvas */}
      {showSignCanvas && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>✒️ Dessiner une signature</h3>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label className="form-label">Nom de la signature *</label>
            <input type="text" className="form-input" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} placeholder="Ex: Signature Oberst Weber" style={{ maxWidth: 400 }} />
          </div>
          <SignatureCanvas onSave={handleSignatureSave} width={500} height={200} />
        </div>
      )}

      {/* Upload form */}
      {showForm && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ marginTop: 0 }}>Ajouter à la bibliothèque</h3>
          <form onSubmit={submit}>
            <div className="form-row" style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Nom *</label>
                <input type="text" className="form-input" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} required placeholder="Ex: Tampon 916. Grenadier-Regiment" />
              </div>
              <div className="form-group">
                <label className="form-label">Régiment</label>
                <select className="form-input" value={form.unite_id} onChange={e => setForm(p => ({...p, unite_id: e.target.value}))}>
                  <option value="">— Général —</option>
                  {unites.map(u => <option key={u.id} value={u.id}>{u.code}. {u.nom}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description (optionnel)</label>
              <input type="text" className="form-input" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Usage, contexte..." />
            </div>
            <div className="form-group">
              <label className="form-label">Image (PNG recommandé, fond transparent) *</label>
              <input type="file" accept="image/*" ref={fileRef} onChange={handleFile} className="form-input" />
            </div>
            {preview && (
              <div style={{ marginBottom: 'var(--space-md)', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>Aperçu :</p>
                <div style={{ background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50%/16px 16px', display: 'inline-block', padding: 16, borderRadius: 8 }}>
                  <img src={preview} alt="preview" style={{ maxWidth: 300, maxHeight: 200 }} />
                </div>
              </div>
            )}
            <button type="submit" className="btn btn-primary">📚 Ajouter</button>
          </form>
        </div>
      )}

      {/* Items grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
        {items.length === 0 ? (
          <div className="paper-card" style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>
            Aucun élément dans cette catégorie
          </div>
        ) : items.map(item => (
          <div key={item.id} className="paper-card" style={{ textAlign: 'center', position: 'relative' }}>
            <div style={{ background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50%/12px 12px', padding: 12, borderRadius: 6, marginBottom: 8 }}>
              <img src={item.image_data} alt={item.nom} style={{ maxWidth: '100%', maxHeight: 150, objectFit: 'contain' }} />
            </div>
            <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem' }}>{item.nom}</h4>
            {item.description && <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.description}</p>}
            {item.unite_nom && <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>{item.unite_code}. {item.unite_nom}</span>}
            <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>par {item.created_by_nom}</p>
            {(user?.isAdmin || user?.id === item.created_by) && (
              <button onClick={() => remove(item.id)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }} title="Supprimer">🗑️</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
