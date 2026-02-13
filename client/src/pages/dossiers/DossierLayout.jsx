import { useState, useEffect, useRef } from 'react'
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
  const [importSearch, setImportSearch] = useState('')
  const [importResults, setImportResults] = useState(null) // { rapports, visites, interdits, telegrammes }
  const [importLoading, setImportLoading] = useState(false)
  const [allData, setAllData] = useState(null) // cached full lists
  const searchRef = useRef(null)
  const debounceRef = useRef(null)

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

  const openImport = async () => {
    setShowImport(true)
    setImportSearch('')
    setImportResults(null)
    setTimeout(() => searchRef.current?.focus(), 150)

    // Load all data once on first open
    if (!allData) {
      setImportLoading(true)
      try {
        const [rRes, vRes, iRes, tRes] = await Promise.all([
          api.get('/rapports'), api.get('/medical'), api.get('/interdits'), api.get('/telegrammes')
        ])
        const d = {
          rapports: (rRes.data?.data || []).map(r => ({ id: r.id, title: r.titre || r.type, sub: `${r.auteur_nom || '?'} — ${r.date_rp || ''}`, badge: r.type, cat: 'rapport', icon: '📋', url: `/rapports/${r.id}` })),
          visites: (vRes.data?.data || []).map(r => ({ id: r.id, title: `${r.effectif_prenom || ''} ${r.effectif_nom || ''}`, sub: `${r.diagnostic || '—'} — ${r.aptitude || ''}`, badge: 'visite', cat: 'visite', icon: '🏥', url: `/medical/${r.id}` })),
          interdits: (iRes.data?.data || []).map(r => ({ id: r.id, title: `${r.effectif_prenom || ''} ${r.effectif_nom || ''}`, sub: `${(r.motif || '').substring(0, 60)}`, badge: r.statut || 'actif', cat: 'interdit', icon: '⛔', url: `/interdits` })),
          telegrammes: (tRes.data?.data || []).map(r => ({ id: r.id, title: `${r.numero || 'TEL'} — ${(r.objet || '').substring(0, 40)}`, sub: `${r.expediteur_texte || '?'} → ${r.destinataire_texte || '?'}`, badge: r.priorite || 'normal', cat: 'telegramme', icon: '📨', url: `/telegrammes` })),
        }
        setAllData(d)
        setImportResults(d)
      } catch { setAllData({ rapports: [], visites: [], interdits: [], telegrammes: [] }) }
      setImportLoading(false)
    } else {
      setImportResults(allData)
    }
  }

  // Filter all data when search changes
  useEffect(() => {
    if (!allData || !showImport) return
    if (!importSearch.trim()) { setImportResults(allData); return }
    const q = importSearch.toLowerCase()
    setImportResults({
      rapports: allData.rapports.filter(i => `${i.title} ${i.sub}`.toLowerCase().includes(q)),
      visites: allData.visites.filter(i => `${i.title} ${i.sub}`.toLowerCase().includes(q)),
      interdits: allData.interdits.filter(i => `${i.title} ${i.sub}`.toLowerCase().includes(q)),
      telegrammes: allData.telegrammes.filter(i => `${i.title} ${i.sub}`.toLowerCase().includes(q)),
    })
  }, [importSearch, allData, showImport])

  const generateBlocks = (dos, entries) => {
    const b = []
    let y = 30

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

    entries.forEach((e, i) => {
      b.push({ id: `entry-title-${i}`, type: 'title', content: `<b>${e.titre || `Note ${i+1}`}</b>`, x: 40, y, w: 500, h: 25 })
      y += 28
      b.push({ id: `entry-content-${i}`, type: 'text', content: e.contenu || '', x: 40, y, w: 700, h: 80 })
      y += 90
      b.push({ id: `entry-meta-${i}`, type: 'text', content: `<small>Par ${e.created_by_nom || '—'} ${e.date_rp ? `· RP: ${e.date_rp}` : ''}</small>`, x: 40, y, w: 400, h: 20 })
      y += 30
    })

    b.push({ id: 'sep2', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
    y += 20
    b.push({ id: 'footer', type: 'text', content: 'Archives du 7e Armeekorps', x: 250, y, w: 300, h: 25 })

    return b
  }

  const importPiece = (item) => {
    const maxY = blocks.reduce((max, bl) => Math.max(max, (bl.y || 0) + (bl.h || 50)), 100)
    const newId = `doc-${Date.now()}`
    const catLabels = { rapport: 'Rapports', visite: 'Visites médicales', interdit: 'Interdits de front', telegramme: 'Télégrammes' }
    setBlocks(prev => [
      ...prev,
      {
        id: newId,
        type: 'document',
        content: item.title,
        x: 40,
        y: maxY + 20,
        w: 300,
        h: 100,
        docRef: {
          id: item.id,
          label: item.title,
          sub: item.sub,
          badge: item.badge,
          category: catLabels[item.cat] || item.cat,
          url: item.url
        }
      }
    ])
    setMessage(`📎 ${item.title} épinglé`)
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

  const totalResults = importResults ? Object.values(importResults).reduce((s, arr) => s + arr.length, 0) : 0

  const renderSection = (label, icon, items) => {
    if (!items || items.length === 0) return null
    return (
      <div className="import-section" key={label}>
        <div className="import-section-header">{icon} {label} <span className="import-section-count">{items.length}</span></div>
        {items.slice(0, 15).map(item => (
          <button key={`${item.cat}-${item.id}`} className="import-picker-item" onClick={() => importPiece(item)}>
            <div className="import-item-top">
              <span className="import-item-icon">{item.icon}</span>
              <span className="import-item-label">{item.title}</span>
              {item.badge && <span className="import-item-badge">{item.badge}</span>}
            </div>
            {item.sub && <div className="import-item-sub">{item.sub}</div>}
          </button>
        ))}
        {items.length > 15 && <p className="import-more">… et {items.length - 15} autres — affinez votre recherche</p>}
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <BackButton label="← Retour au dossier" />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-secondary btn-small" onClick={openImport}>📎 Épingler un document</button>
          {message && <span style={{ fontSize: '0.85rem' }}>{message}</span>}
        </div>
      </div>

      {/* Import picker — global search */}
      {showImport && (
        <div className="popup-overlay" onClick={() => setShowImport(false)}>
          <div className="popup-content import-picker-modal" onClick={e => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setShowImport(false)}>✕</button>
            <h2 className="import-picker-title">📎 Épingler un document</h2>

            <input
              ref={searchRef}
              className="form-input import-picker-search"
              placeholder="🔍 Rechercher un rapport, une visite, un télégramme..."
              value={importSearch}
              onChange={e => setImportSearch(e.target.value)}
            />

            {importLoading ? (
              <p className="import-picker-empty">Chargement des archives...</p>
            ) : !importResults ? null : totalResults === 0 ? (
              <p className="import-picker-empty">Aucun résultat pour « {importSearch} »</p>
            ) : (
              <div className="import-picker-results">
                {!importSearch.trim() && <p className="import-picker-hint">Tapez pour filtrer, ou parcourez les archives ci-dessous</p>}
                {renderSection('Rapports', '📋', importResults.rapports)}
                {renderSection('Visites médicales', '🏥', importResults.visites)}
                {renderSection('Interdits de front', '⛔', importResults.interdits)}
                {renderSection('Télégrammes', '📨', importResults.telegrammes)}
              </div>
            )}
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
