import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import LayoutEditor from '../../components/LayoutEditor'

export default function SoldbuchLayout() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [effectif, setEffectif] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      const res = await api.get(`/soldbuch/${id}`)
      const eff = res.data.data.effectif
      const layout = res.data.data.layout
      setEffectif(eff)

      if (layout?.blocks) {
        setBlocks(layout.blocks)
      } else {
        setBlocks(generateDefaultBlocks(eff))
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const generateDefaultBlocks = (eff) => {
    const b = []
    let y = 30
    
    // Header
    b.push({ id: 'header', type: 'title', content: '<b>SOLDBUCH</b>', x: 250, y, w: 300, h: 40 })
    y += 50
    b.push({ id: 'subtitle', type: 'text', content: 'Livret militaire individuel — Archives 7e Armeekorps', x: 150, y, w: 500, h: 25 })
    y += 40
    b.push({ id: 'sep1', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
    y += 20

    // Identity
    b.push({ id: 'lbl-name', type: 'title', content: '<b>1. IDENTITÉ</b>', x: 40, y, w: 300, h: 30 })
    y += 35
    b.push({ id: 'name', type: 'text', content: `<b>Nom :</b> ${eff.nom || '—'}<br/><b>Prénom :</b> ${eff.prenom || '—'}${eff.surnom ? `<br/><b>Surnom :</b> ${eff.surnom}` : ''}`, x: 40, y, w: 350, h: 70 })
    b.push({ id: 'photo', type: 'image', content: eff.photo_url || '', x: 580, y: y - 35, w: 170, h: 200 })
    y += 80

    // Military info
    b.push({ id: 'grade', type: 'text', content: `<b>Grade :</b> ${eff.grade_nom || '—'}<br/><b>Unité :</b> ${eff.unite_nom || '—'}${eff.fonction ? `<br/><b>Fonction :</b> ${eff.fonction}` : ''}${eff.categorie ? `<br/><b>Catégorie :</b> ${eff.categorie}` : ''}`, x: 40, y, w: 350, h: 80 })
    y += 95

    // Service info
    b.push({ id: 'lbl-service', type: 'title', content: '<b>2. SERVICE</b>', x: 40, y, w: 300, h: 30 })
    y += 35
    b.push({ id: 'service', type: 'text', content: `<b>Date d'incorporation :</b> ${eff.date_incorporation || '—'}<br/><b>Groupe sanguin :</b> ${eff.groupe_sanguin || '—'}<br/><b>Spécialité :</b> ${eff.specialite || '—'}`, x: 40, y, w: 400, h: 70 })
    y += 85

    // Equipment
    b.push({ id: 'lbl-equip', type: 'title', content: '<b>3. ÉQUIPEMENT</b>', x: 40, y, w: 300, h: 30 })
    y += 35
    b.push({ id: 'equip', type: 'text', content: `<b>Arme principale :</b> ${eff.arme_principale || '—'}<br/><b>Arme secondaire :</b> ${eff.arme_secondaire || '—'}<br/><b>Équipement spécial :</b> ${eff.equipement_special || '—'}<br/><b>Tenue :</b> ${eff.tenue || '—'}`, x: 40, y, w: 500, h: 90 })
    y += 105

    // Decorations
    b.push({ id: 'lbl-deco', type: 'title', content: '<b>4. DÉCORATIONS</b>', x: 40, y, w: 300, h: 30 })
    y += 35
    b.push({ id: 'deco', type: 'text', content: eff.decorations_text || 'Aucune décoration enregistrée', x: 40, y, w: 500, h: 60 })
    y += 75

    // History
    b.push({ id: 'lbl-hist', type: 'title', content: '<b>5. HISTORIQUE</b>', x: 40, y, w: 300, h: 30 })
    y += 35
    b.push({ id: 'hist', type: 'text', content: eff.historique || 'Aucun historique', x: 40, y, w: 700, h: 120 })
    y += 135

    // Separator + Signature
    b.push({ id: 'sep2', type: 'separator', content: '', x: 40, y, w: 720, h: 4 })
    y += 20
    b.push({ id: 'sig', type: 'signature', content: `${eff.prenom || ''} ${eff.nom || ''} — ${eff.grade_nom || ''}`, x: 450, y, w: 300, h: 50 })

    return b
  }

  const handleSave = async (newBlocks) => {
    try {
      await api.put(`/soldbuch/${id}/layout`, { layout: { blocks: newBlocks } })
      setMessage('💾 Mise en page sauvegardée')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Erreur: ' + (err.response?.data?.message || err.message))
    }
  }

  const handlePublish = async (html, publishedBlocks) => {
    try {
      await api.put(`/soldbuch/${id}/layout`, { layout: { blocks: publishedBlocks || blocks, html_published: html } })
      setMessage('📜 Soldbuch publié ! Redirection...')
      setTimeout(() => navigate(`/effectifs/${id}/soldbuch`), 1500)
    } catch (err) {
      setMessage('❌ Erreur')
    }
  }

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>
  if (!effectif) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Effectif introuvable</div>

  return (
    <div style={{ padding: '1rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <BackButton label="← Retour au Soldbuch" />
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
        title={`Soldbuch — ${effectif.prenom} ${effectif.nom}`}
      />
    </div>
  )
}
