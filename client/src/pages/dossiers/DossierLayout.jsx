import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import LayoutEditor from '../../components/LayoutEditor'

export default function DossierLayout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [dossier, setDossier] = useState(null)
  const [entrees, setEntrees] = useState([])
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showImport, setShowImport] = useState(false)

  // Available pieces to import
  const [rapports, setRapports] = useState([])
  const [visites, setVisites] = useState([])
  const [interdits, setInterdits] = useState([])

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    try {
      const [dRes, lRes] = await Promise.all([
        api.get(`/dossiers/${id}`),
        api.get(`/dossiers/${id}/layout`).catch(() => ({ data: { blocks: null } }))
      ])
      const d = dRes.data.data
      setDossier(d.dossier)
      setEntrees(d.entrees || [])

      if (lRes.data?.blocks) {
        setBlocks(lRes.data.blocks)
      } else {
        setBlocks(generateBlocks(d.dossier, d.entrees || []))
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const loadImportables = async () => {
    try {
      const [rRes, vRes, iRes] = await Promise.all([
        api.get('/rapports'),
        api.get('/medical'),
        api.get('/interdits')
      ])
      setRapports(rRes.data.data || [])
      setVisites(vRes.data.data || [])
      setInterdits(iRes.data.data || [])
    } catch {}
    setShowImport(true)
  }

  const generateBlocks = (dos, entries) => {
    const b = []
    let y = 30

    // Cover
    b.push({ id: 'stamp', type: 'text', content: '<span style="color:rgba(180,40,40,0.4);font-weight:900;letter-spacing:3px">GEHEIM</span>', x: 600, y: 15, w: 150, h: 25 })
    b.push({ id: 'title', type: 'title', content: `<b>${dos.titre || 'DOSSIER'}</b>`, x: 150, y, w: 500, h: 40 })
    y += 50
    if (dos.description) {
      b.push({ id: 'desc', type: 'text', content: dos.description, x: 100, y, w: 600, h: 30 })
      y += 40
    }
    b.push({ id: 'meta', type: 'text', content: `<b>Type :</b> ${dos.type || '—'} · <b>Visibilité :</b> ${dos.visibilite || '—'} · <b>Entrées :</b> ${entries.length}`, x: 40, y, w: 700, h: 25 })
    y += 35
    b.push({ id: 'sep1', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
    y += 25

    // Entries
    entries.forEach((e, i) => {
      b.push({ id: `entry-title-${i}`, type: 'title', content: `<b>${e.titre || `Note ${i+1}`}</b>`, x: 40, y, w: 500, h: 25 })
      y += 28
      b.push({ id: `entry-content-${i}`, type: 'text', content: e.contenu || '', x: 40, y, w: 700, h: 80 })
      y += 90
      b.push({ id: `entry-meta-${i}`, type: 'text', content: `<small>Par ${e.created_by_nom || '—'} ${e.date_rp ? `· RP: ${e.date_rp}` : ''}</small>`, x: 40, y, w: 400, h: 20 })
      y += 30
    })

    // Footer
    b.push({ id: 'sep2', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
    y += 20
    b.push({ id: 'footer', type: 'text', content: 'Archives du 7e Armeekorps', x: 250, y, w: 300, h: 25 })

    return b
  }

  const importPiece = (type, item) => {
    const newId = `import-${type}-${item.id}-${Date.now()}`
    let content = ''
    let title = ''

    if (type === 'rapport') {
      title = `📝 ${item.numero || ''} — ${item.titre || 'Rapport'}`
      content = `<b>${item.titre}</b><br/>Auteur: ${item.auteur_nom || '—'}<br/>Type: ${item.type}<br/>Date RP: ${item.date_rp || '—'}`
    } else if (type === 'visite') {
      title = `🏥 Visite médicale — ${item.effectif_prenom || ''} ${item.effectif_nom || ''}`
      content = `<b>Patient:</b> ${item.effectif_prenom || ''} ${item.effectif_nom || ''}<br/><b>Diagnostic:</b> ${item.diagnostic || '—'}<br/><b>Aptitude:</b> ${item.aptitude || '—'}`
    } else if (type === 'interdit') {
      title = `🚫 Interdit de front — ${item.effectif_prenom || ''} ${item.effectif_nom || ''}`
      content = `<b>Type:</b> ${item.type || '—'}<br/><b>Motif:</b> ${item.motif || '—'}`
    }

    const maxY = blocks.reduce((max, bl) => Math.max(max, (bl.y || 0) + (bl.h || 50)), 100)
    setBlocks(prev => [
      ...prev,
      { id: `${newId}-t`, type: 'title', content: `<b>${title}</b>`, x: 40, y: maxY + 20, w: 700, h: 28 },
      { id: `${newId}-c`, type: 'text', content, x: 40, y: maxY + 52, w: 700, h: 80 },
      { id: `${newId}-s`, type: 'separator', content: '', x: 40, y: maxY + 140, w: 720, h: 4 }
    ])
    setMessage(`✅ ${title} importé`)
    setTimeout(() => setMessage(''), 2000)
  }

  const handleSave = async (newBlocks) => {
    try {
      await api.put(`/dossiers/${id}/layout`, { blocks: newBlocks })
      setMessage('💾 Sauvegardé')
      setTimeout(() => setMessage(''), 2000)
    } catch { setMessage('❌ Erreur') }
  }

  const handlePublish = async (html) => {
    try {
      await api.put(`/dossiers/${id}/layout`, { blocks, html_published: html })
      setMessage('📜 Dossier publié')
      setTimeout(() => navigate(`/dossiers/${id}`), 1500)
    } catch { setMessage('❌ Erreur') }
  }

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>

  return (
    <div style={{ padding: '1rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <BackButton label="← Retour au dossier" />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-secondary btn-small" onClick={loadImportables}>📥 Importer une pièce</button>
          {message && <span style={{ fontSize: '0.85rem' }}>{message}</span>}
        </div>
      </div>

      {/* Import modal */}
      {showImport && (
        <div className="popup-overlay" onClick={() => setShowImport(false)}>
          <div className="popup-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}>
            <button className="popup-close" onClick={() => setShowImport(false)}>✕</button>
            <h2 style={{ marginTop: 0 }}>📥 Importer une pièce dans le dossier</h2>

            <h3 style={{ fontSize: '0.9rem', marginTop: '1rem' }}>📝 Rapports ({rapports.length})</h3>
            {rapports.slice(0, 10).map(r => (
              <div key={r.id} onClick={() => importPiece('rapport', r)} style={{ padding: '0.4rem 0.6rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(107,143,60,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <strong>{r.numero}</strong> — {r.titre} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({r.type})</span>
              </div>
            ))}

            <h3 style={{ fontSize: '0.9rem', marginTop: '1rem' }}>🏥 Visites médicales ({visites.length})</h3>
            {visites.slice(0, 10).map(v => (
              <div key={v.id} onClick={() => importPiece('visite', v)} style={{ padding: '0.4rem 0.6rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(107,143,60,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <strong>{v.effectif_prenom} {v.effectif_nom}</strong> — {v.diagnostic || '—'} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({v.aptitude})</span>
              </div>
            ))}

            <h3 style={{ fontSize: '0.9rem', marginTop: '1rem' }}>🚫 Interdits de front ({interdits.length})</h3>
            {interdits.slice(0, 10).map(i => (
              <div key={i.id} onClick={() => importPiece('interdit', i)} style={{ padding: '0.4rem 0.6rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(107,143,60,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <strong>{i.effectif_prenom} {i.effectif_nom}</strong> — {i.motif} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({i.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <LayoutEditor
        blocks={blocks}
        onSave={handleSave}
        onPublish={handlePublish}
        title={`Dossier — ${dossier?.titre || ''}`}
        height={1200}
      />
    </div>
  )
}
