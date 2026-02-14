import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import LayoutEditor from '../../components/LayoutEditor'

export default function DossierLayout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dossier, setDossier] = useState(null)
  const [entrees, setEntrees] = useState([])
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    try {
      const dRes = await api.get(`/dossiers/${id}`)
      const d = dRes.data.data
      setDossier(d.dossier)
      setEntrees(d.entrees || [])

      // Check for saved layout
      try {
        const lRes = await api.get(`/dossiers/${id}/layout`)
        if (lRes.data?.blocks) {
          setBlocks(lRes.data.blocks)
          setLoading(false)
          return
        }
      } catch {}

      // Generate default blocks
      setBlocks(generateBlocks(d.dossier, d.entrees || []))
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const generateBlocks = (dos, entries) => {
    const b = []
    let y = 30

    // Header
    b.push({ id: 'stamp', type: 'text', content: '<span style="color:rgba(180,40,40,0.4);font-weight:900;letter-spacing:3px;border:2px solid rgba(180,40,40,0.3);padding:2px 10px">GEHEIM</span>', x: 560, y: 15, w: 200, h: 35 })
    b.push({ id: 'emblem', type: 'text', content: '<span style="font-size:2.5rem;opacity:0.4">✠</span>', x: 340, y: 25, w: 120, h: 60 })
    b.push({ id: 'title', type: 'title', content: `<b>${dos.titre || 'DOSSIER'}</b>`, x: 150, y: 100, w: 500, h: 40 })
    y = 150
    if (dos.description) {
      b.push({ id: 'desc', type: 'text', content: `<i>${dos.description}</i>`, x: 150, y, w: 500, h: 30 })
      y += 35
    }
    b.push({ id: 'meta', type: 'text', content: `<b>Type :</b> ${dos.type || '—'} · <b>Visibilité :</b> ${dos.visibilite || '—'} · <b>Entrées :</b> ${entries.length}`, x: 80, y, w: 640, h: 25 })
    y += 35
    b.push({ id: 'sep1', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
    y += 25

    // Entries
    entries.forEach((e, i) => {
      b.push({ id: `entry-h-${i}`, type: 'title', content: `<b>${e.titre || `Entrée ${i + 1}`}</b>`, x: 40, y, w: 500, h: 28 })
      if (e.date_rp) {
        b.push({ id: `entry-d-${i}`, type: 'text', content: `<i>${e.date_rp}</i>`, x: 580, y, w: 180, h: 20 })
      }
      y += 32
      b.push({ id: `entry-c-${i}`, type: 'text', content: e.contenu || '', x: 40, y, w: 720, h: 80 })
      y += 90
      b.push({ id: `entry-a-${i}`, type: 'text', content: `<small>Par ${e.created_by_nom || '—'}</small>`, x: 40, y, w: 300, h: 18 })
      y += 28
    })

    // Footer
    b.push({ id: 'sep2', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
    y += 20
    b.push({ id: 'footer', type: 'text', content: '📜 Archives du 7e Armeekorps', x: 250, y, w: 300, h: 25 })

    return b
  }

  const handleSave = async (newBlocks) => {
    try {
      await api.put(`/dossiers/${id}/layout`, { blocks: newBlocks })
      setMessage('💾 Sauvegardé')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Save error:', err)
      setMessage('❌ Erreur de sauvegarde')
    }
  }

  const handlePublish = async (html, publishedBlocks) => {
    try {
      await api.put(`/dossiers/${id}/layout`, { blocks: publishedBlocks || blocks, html_published: html })
      setMessage('📜 Dossier publié ! Redirection...')
      setTimeout(() => navigate(`/dossiers/${id}`), 1500)
    } catch (err) {
      console.error('Publish error:', err)
      setMessage('❌ Erreur de publication')
    }
  }

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>
  if (!dossier) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Dossier introuvable</div>

  return (
    <div style={{ padding: '1rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <BackButton label="← Retour au dossier" />
        {message && (
          <div className={`alert ${message.includes('❌') ? 'alert-danger' : 'alert-success'}`} style={{ margin: '0.5rem 0', textAlign: 'center', fontWeight: 600 }}>
            {message}
          </div>
        )}
      </div>
      <LayoutEditor
        blocks={blocks}
        onSave={handleSave}
        onPublish={handlePublish}
        title={`Dossier — ${dossier?.titre || ''}`}
        height={Math.max(1100, 200 + entrees.length * 170)}
      />
    </div>
  )
}
