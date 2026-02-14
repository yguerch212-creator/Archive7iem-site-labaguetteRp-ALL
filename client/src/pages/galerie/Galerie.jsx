import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'

export default function Galerie() {
  const { user } = useAuth()
  const [photos, setPhotos] = useState([])
  const [unites, setUnites] = useState([])
  const [filterUnite, setFilterUnite] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titre: '', description: '', unite_id: '', image_data: '' })
  const [preview, setPreview] = useState(null)
  const [selected, setSelected] = useState(null)
  const [msg, setMsg] = useState('')
  const fileRef = useRef()

  const canModerate = user?.isAdmin || user?.isOfficier

  useEffect(() => {
    api.get('/unites').then(r => setUnites(r.data.data || r.data)).catch(() => {})
    load()
  }, [])

  useEffect(() => { load() }, [filterUnite])

  const load = () => {
    const params = {}
    if (filterUnite) params.unite_id = filterUnite
    if (canModerate) params.all = '1'
    api.get('/galerie', { params }).then(r => setPhotos(r.data.data)).catch(() => {})
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => { setForm(f => ({ ...f, image_data: ev.target.result })); setPreview(ev.target.result) }
    reader.readAsDataURL(file)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.image_data) { setMsg('Image requise'); return }
    try {
      await api.post('/galerie', form)
      setShowForm(false); setForm({ titre: '', description: '', unite_id: '', image_data: '' }); setPreview(null)
      setMsg(canModerate ? '✅ Photo ajoutée' : '✅ Photo soumise pour approbation')
      setTimeout(() => setMsg(''), 3000); load()
    } catch (err) { setMsg(err.response?.data?.message || 'Erreur') }
  }

  const approve = async (id) => { try { await api.put(`/galerie/${id}/approve`); load() } catch {} }
  const remove = async (id) => { if (confirm('Supprimer ?')) { try { await api.delete(`/galerie/${id}`); load(); setSelected(null) } catch {} } }

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton label="← Tableau de bord" />
        {!user?.isGuest && <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>{showForm ? '✕' : '📸 Ajouter'}</button>}
      </div>
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>📸 Galerie RP</h1>
      {msg && <div className="alert alert-success">{msg}</div>}

      <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <button className={`btn btn-sm ${!filterUnite ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterUnite('')}>Toutes</button>
        {unites.map(u => <button key={u.id} className={`btn btn-sm ${filterUnite == u.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterUnite(u.id)}>{u.code}</button>)}
      </div>

      {showForm && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <form onSubmit={submit}>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 2 }}><label className="form-label">Titre</label><input className="form-input" value={form.titre} onChange={e => setForm(f=>({...f,titre:e.target.value}))} placeholder="Description de la photo..." /></div>
              <div className="form-group"><label className="form-label">Unité</label><select className="form-input" value={form.unite_id} onChange={e => setForm(f=>({...f,unite_id:e.target.value}))}>
                <option value="">— Général —</option>{unites.map(u => <option key={u.id} value={u.id}>{u.code}. {u.nom}</option>)}
              </select></div>
            </div>
            <div className="form-group"><label className="form-label">Photo *</label><input type="file" accept="image/*" ref={fileRef} onChange={handleFile} className="form-input" /></div>
            {preview && <div style={{ marginBottom: 'var(--space-md)', textAlign: 'center' }}><img src={preview} alt="" style={{ maxWidth: 400, maxHeight: 250, borderRadius: 8 }} /></div>}
            <button type="submit" className="btn btn-primary">📸 Publier</button>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
        {photos.length === 0 ? (
          <div className="paper-card" style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>Aucune photo</div>
        ) : photos.map(p => (
          <div key={p.id} className="paper-card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', position: 'relative' }} onClick={() => setSelected(p)}>
            {!p.approuve && <div style={{ position: 'absolute', top: 8, left: 8, background: 'var(--warning)', color: '#fff', fontSize: '0.65rem', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>⏳ En attente</div>}
            <img src={p.image_data} alt={p.titre || ''} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
            <div style={{ padding: 'var(--space-sm)' }}>
              {p.titre && <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{p.titre}</div>}
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.auteur_nom} — {p.unite_code || 'Général'}</div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="popup-overlay" onClick={() => setSelected(null)}>
          <div className="popup-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, padding: 0 }}>
            <button className="popup-close" onClick={() => setSelected(null)}>✕</button>
            <img src={selected.image_data} alt="" style={{ width: '100%', borderRadius: '8px 8px 0 0' }} />
            <div style={{ padding: 'var(--space-lg)' }}>
              {selected.titre && <h3 style={{ margin: '0 0 8px' }}>{selected.titre}</h3>}
              {selected.description && <p style={{ margin: '0 0 8px', fontSize: '0.85rem' }}>{selected.description}</p>}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Par {selected.auteur_nom} — {selected.unite_code || 'Général'}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {canModerate && !selected.approuve && <button className="btn btn-sm btn-primary" onClick={() => { approve(selected.id); setSelected(null) }}>✅ Approuver</button>}
                {(canModerate || selected.created_by === user?.id) && <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => remove(selected.id)}>🗑️ Supprimer</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
