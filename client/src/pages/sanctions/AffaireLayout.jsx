import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import LayoutEditor from '../../components/LayoutEditor'

const ROLE_LABELS = { Accuse: 'Accusé', Temoin: 'Témoin', Victime: 'Victime', Enqueteur: 'Enquêteur', Juge: 'Juge', Defenseur: 'Défenseur' }
const PIECE_ICONS = { 'Proces-verbal': '📋', 'Temoignage': '🗣️', 'Decision': '⚖️', 'Rapport-infraction': '🚨', 'Piece-a-conviction': '🔗', 'Requisitoire': '📜', 'Note-interne': '🔒', 'Autre': '📄' }

export default function AffaireLayout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [affaire, setAffaire] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    try {
      const [aRes, lRes] = await Promise.all([
        api.get(`/affaires/${id}`),
        api.get(`/affaires/${id}/layout`).catch(() => ({ data: { blocks: null } }))
      ])
      setAffaire(aRes.data)

      if (lRes.data?.blocks) {
        setBlocks(lRes.data.blocks)
      } else {
        setBlocks(generateBlocks(aRes.data))
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const generateBlocks = (a) => {
    const b = []
    let y = 20

    // Header
    b.push({ id: 'watermark', type: 'text', content: '<span style="color:rgba(180,40,40,0.3);font-weight:900;letter-spacing:3px;font-size:0.7rem">DOSSIER JUDICIAIRE — CONFIDENTIEL</span>', x: 180, y, w: 450, h: 20 })
    y += 30
    b.push({ id: 'numero', type: 'text', content: `<span style="color:gray;font-size:0.8rem">${a.numero || ''}</span>`, x: 300, y, w: 200, h: 20 })
    y += 25
    b.push({ id: 'title', type: 'title', content: `<b>⚖️ ${a.titre || 'AFFAIRE'}</b>`, x: 100, y, w: 600, h: 40 })
    y += 50
    b.push({ id: 'meta', type: 'text', content: `<b>Type :</b> ${a.type || '—'} · <b>Statut :</b> ${a.statut || '—'} · <b>Gravité :</b> Groupe ${a.gravite || '—'}${a.lieu ? ` · <b>Lieu :</b> ${a.lieu}` : ''}`, x: 40, y, w: 720, h: 30 })
    y += 40
    b.push({ id: 'sep1', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
    y += 25

    // Description
    if (a.description) {
      b.push({ id: 'lbl-desc', type: 'title', content: '<b>EXPOSÉ DES FAITS</b>', x: 40, y, w: 300, h: 28 })
      y += 32
      b.push({ id: 'desc', type: 'text', content: a.description, x: 40, y, w: 720, h: 100 })
      y += 115
    }

    // Personnes impliquées
    if (a.personnes && a.personnes.length > 0) {
      b.push({ id: 'lbl-pers', type: 'title', content: '<b>PERSONNES IMPLIQUÉES</b>', x: 40, y, w: 400, h: 28 })
      y += 35
      const persText = a.personnes.map(p =>
        `${ROLE_LABELS[p.role] || p.role} : <b>${p.effectif_prenom || ''} ${p.effectif_nom || p.nom_libre || '—'}</b>${p.effectif_grade ? ` (${p.effectif_grade})` : ''}`
      ).join('<br/>')
      b.push({ id: 'pers', type: 'text', content: persText, x: 40, y, w: 700, h: Math.max(50, a.personnes.length * 22) })
      y += Math.max(60, a.personnes.length * 22 + 15)
    }

    // Pièces au dossier
    if (a.pieces && a.pieces.length > 0) {
      b.push({ id: 'sep-pieces', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
      y += 15
      b.push({ id: 'lbl-pieces', type: 'title', content: '<b>PIÈCES AU DOSSIER</b>', x: 40, y, w: 400, h: 28 })
      y += 35

      a.pieces.forEach((p, i) => {
        const icon = PIECE_ICONS[p.type_piece] || '📄'
        b.push({ id: `piece-${i}`, type: 'text', content: `${icon} <b>${p.titre}</b> <small>(${p.type_piece})</small><br/>${p.contenu || ''}`, x: 40, y, w: 700, h: 80 })
        y += 90
      })
    }

    // Infractions
    if (a.infractions_details && a.infractions_details.length > 0) {
      b.push({ id: 'sep-inf', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
      y += 15
      b.push({ id: 'lbl-inf', type: 'title', content: '<b>INFRACTIONS</b>', x: 40, y, w: 300, h: 28 })
      y += 35
      const infText = a.infractions_details.map(inf => `• <b>${inf.nom}</b> (Groupe ${inf.groupe})`).join('<br/>')
      b.push({ id: 'inf', type: 'text', content: infText, x: 40, y, w: 700, h: Math.max(40, a.infractions_details.length * 22) })
      y += Math.max(50, a.infractions_details.length * 22 + 15)
    }

    // Decision
    if (a.decision) {
      b.push({ id: 'sep-dec', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
      y += 15
      b.push({ id: 'lbl-dec', type: 'title', content: '<b>DÉCISION</b>', x: 40, y, w: 300, h: 28 })
      y += 32
      b.push({ id: 'dec', type: 'text', content: a.decision, x: 40, y, w: 700, h: 80 })
      y += 95
    }

    // Signatures
    b.push({ id: 'sep-final', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
    y += 25
    b.push({ id: 'sig', type: 'signature', content: 'Le Juge — Grade et Nom', x: 400, y, w: 350, h: 50 })
    y += 60
    b.push({ id: 'footer', type: 'text', content: 'Tribunal Militaire — 7e Armeekorps', x: 220, y, w: 400, h: 25 })

    return b
  }

  const handleSave = async (newBlocks) => {
    try {
      await api.put(`/affaires/${id}/layout`, { blocks: newBlocks })
      setMessage('💾 Sauvegardé')
      setTimeout(() => setMessage(''), 2000)
    } catch { setMessage('❌ Erreur') }
  }

  const handlePublish = async (html) => {
    try {
      await api.put(`/affaires/${id}/layout`, { blocks, html_published: html })
      setMessage('📜 Dossier judiciaire publié')
      setTimeout(() => navigate(`/sanctions/${id}`), 1500)
    } catch { setMessage('❌ Erreur') }
  }

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>

  return (
    <div style={{ padding: '1rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <BackButton label="← Retour à l'affaire" />
        {message && <span style={{ fontSize: '0.85rem' }}>{message}</span>}
      </div>
      <LayoutEditor
        blocks={blocks}
        onSave={handleSave}
        onPublish={handlePublish}
        title={`Affaire — ${affaire?.numero || ''} ${affaire?.titre || ''}`}
        height={1400}
        affaireId={id}
      />
    </div>
  )
}
