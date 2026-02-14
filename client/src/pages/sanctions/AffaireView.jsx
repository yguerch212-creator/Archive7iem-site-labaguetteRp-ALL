import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'
import { formatDate, formatDateTime } from '../../utils/dates'
import { exportToPdf } from '../../utils/exportPdf'
import './sanctions.css'

const ROLES = ['Accuse', 'Temoin', 'Victime', 'Enqueteur', 'Juge', 'Defenseur']
const ROLE_ICONS = { Accuse: '⛓️', Temoin: '👁️', Victime: '🩸', Enqueteur: '🔍', Juge: '⚖️', Defenseur: '🛡️' }
const ROLE_LABELS = { Accuse: 'Accusé', Temoin: 'Témoin', Victime: 'Victime', Enqueteur: 'Enquêteur', Juge: 'Juge', Defenseur: 'Défenseur' }
const TYPES_PIECE = ['Proces-verbal', 'Temoignage', 'Decision', 'Rapport-infraction', 'Piece-a-conviction', 'Requisitoire', 'Note-interne', 'Autre']
const PIECE_ICONS = { 'Proces-verbal': '📋', 'Temoignage': '🗣️', 'Decision': '⚖️', 'Rapport-infraction': '🚨', 'Piece-a-conviction': '🔗', 'Requisitoire': '📜', 'Note-interne': '🔒', 'Autre': '📄' }
const STATUTS = ['Ouverte', 'En cours', 'Audience', 'Jugee', 'Classee', 'Appel']
const STATUT_COLORS = { Ouverte: '#b8860b', 'En cours': '#2980b9', Audience: '#8e44ad', Jugee: '#27ae60', Classee: '#7f8c8d', Appel: '#c0392b' }
const GRAVITE_COLORS = { 1: '#6b8f3c', 2: '#b8860b', 3: '#d2691e', 4: '#c0392b', 5: '#7b0000' }

export default function AffaireView() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [affaire, setAffaire] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showAddPersonne, setShowAddPersonne] = useState(false)
  const [showAddPiece, setShowAddPiece] = useState(false)
  const [showEditAffaire, setShowEditAffaire] = useState(false)
  const [selectedPiece, setSelectedPiece] = useState(null)
  const [infractions, setInfractions] = useState([])

  const canWrite = user?.isAdmin || user?.isOfficier || user?.isFeldgendarmerie

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, iRes] = await Promise.all([
        api.get(`/affaires/${id}`),
        api.get('/affaires/ref/infractions')
      ])
      setAffaire(aRes.data)
      setInfractions(iRes.data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const flash = (text) => { setMessage(text); setTimeout(() => setMessage(''), 3000) }

  const addPersonne = async (data) => {
    try {
      await api.post(`/affaires/${id}/personnes`, data)
      flash('✅ Personne ajoutée')
      setShowAddPersonne(false)
      load()
    } catch (err) { flash('❌ ' + (err.response?.data?.error || 'Erreur')) }
  }

  const removePersonne = async (pid) => {
    if (!confirm('Retirer cette personne ?')) return
    try { await api.delete(`/affaires/personnes/${pid}`); load() } catch { flash('Erreur') }
  }

  const addPiece = async (data) => {
    try {
      await api.post(`/affaires/${id}/pieces`, data)
      flash('✅ Pièce ajoutée au dossier')
      setShowAddPiece(false)
      load()
    } catch (err) { flash('❌ ' + (err.response?.data?.error || 'Erreur')) }
  }

  const removePiece = async (pid) => {
    if (!confirm('Supprimer cette pièce ?')) return
    try { await api.delete(`/affaires/pieces/${pid}`); load() } catch { flash('Erreur') }
  }

  const updateAffaire = async (data) => {
    try {
      await api.put(`/affaires/${id}`, data)
      flash('✅ Affaire mise à jour')
      setShowEditAffaire(false)
      load()
    } catch (err) { flash('❌ Erreur') }
  }

  if (loading) return <div className="container"><p>Chargement...</p></div>
  if (!affaire) return <div className="container"><p>Affaire introuvable</p></div>

  const a = affaire

  return (
    <div className="container affaire-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
        <BackButton />
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {canWrite && <Link to={`/sanctions/${id}/layout`} className="btn btn-secondary btn-small">🖋️ Mise en page</Link>}
          {user?.isAdmin && <button className="btn btn-danger btn-small" onClick={async () => {
            if (!confirm('Supprimer cette affaire et toutes ses données ?')) return
            try { await api.delete(`/affaires/${id}`); navigate('/sanctions') } catch (err) { alert('Erreur') }
          }}>🗑️ Supprimer</button>}
        </div>
      </div>
      {message && <div className="alert alert-success">{message}</div>}

      {/* Header */}
      <div className="affaire-header paper-card">
        <div className="affaire-header-top">
          <div>
            <span className="mono" style={{fontSize:'0.85rem',color:'var(--text-muted)'}}>{a.numero}</span>
            <h1 style={{margin:'0.2rem 0'}}>{a.titre}</h1>
            <div className="affaire-meta">
              <span className="statut-badge" style={{background: STATUT_COLORS[a.statut]}}>{a.statut}</span>
              <span className="groupe-badge" style={{background: GRAVITE_COLORS[a.gravite]}}>Groupe {a.gravite}</span>
              <span>{a.type}</span>
              {a.lieu && <span>📍 {a.lieu}</span>}
            </div>
          </div>
          {canWrite && (
            <button className="btn btn-sm" onClick={() => setShowEditAffaire(true)}>✏️ Modifier</button>
          )}
        </div>
        {a.resume && <p className="affaire-resume">{a.resume}</p>}
        <div className="affaire-dates">
          {a.date_ouverture_rp && <span>📅 RP: {a.date_ouverture_rp}</span>}
          {a.date_ouverture_irl && <span>📅 IRL: {formatDate(a.date_ouverture_irl)}</span>}
          {a.date_cloture_irl && <span>🏁 Clôture: {formatDate(a.date_cloture_irl)}</span>}
        </div>
        {a.verdict && <div className="affaire-verdict"><strong>⚖️ Verdict:</strong> {a.verdict}</div>}
        {a.sanction_prononcee && <div className="affaire-sanction"><strong>🔨 Sanction:</strong> {a.sanction_prononcee}</div>}
      </div>

      {/* Personnes impliquées */}
      <div className="paper-card">
        <div className="section-header">
          <h2>👥 Personnes impliquées ({a.personnes.length})</h2>
          {canWrite && <button className="btn btn-sm btn-primary" onClick={() => setShowAddPersonne(true)}>+ Ajouter</button>}
        </div>
        {a.personnes.length === 0 ? (
          <p className="empty-state">Aucune personne ajoutée</p>
        ) : (
          <div className="personnes-grid">
            {a.personnes.map(p => (
              <div key={p.id} className={`personne-card role-${p.role.toLowerCase()}`}>
                <div className="personne-role">{ROLE_ICONS[p.role]} {ROLE_LABELS[p.role]}</div>
                <div className="personne-nom">
                  {p.effectif_prenom ? `${p.grade_nom ? p.grade_nom + ' ' : ''}${p.effectif_prenom} ${p.effectif_nom}` : p.nom_libre}
                </div>
                {p.unite_code && <div className="personne-unite">{p.unite_code}</div>}
                {p.notes && <div className="personne-notes">{p.notes}</div>}
                {canWrite && <button className="personne-remove" onClick={() => removePersonne(p.id)}>✕</button>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pièces du dossier */}
      <div className="paper-card">
        <div className="section-header">
          <h2>📁 Pièces du dossier ({a.pieces.length})</h2>
          {canWrite && <button className="btn btn-sm btn-primary" onClick={() => setShowAddPiece(true)}>+ Nouvelle pièce</button>}
        </div>
        {a.pieces.length === 0 ? (
          <p className="empty-state">Aucune pièce au dossier</p>
        ) : (
          <table className="data-table">
            <thead><tr><th></th><th>Pièce</th><th>Type</th><th>Signatures</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {a.pieces.map(p => (
                <tr key={p.id} className="clickable-row" onClick={() => loadPieceDetail(p.id)}>
                  <td>{PIECE_ICONS[p.type] || '📄'}</td>
                  <td><strong>{p.titre}</strong>{p.confidentiel ? ' 🔒' : ''}</td>
                  <td>{p.type.replace(/-/g, ' ')}</td>
                  <td>{p.nb_signees}/{p.nb_signatures} ✍️</td>
                  <td>{p.date_irl ? formatDate(p.date_irl) : p.date_rp || '—'}</td>
                  <td onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-sm btn-secondary" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => navigate(`/pieces/${p.id}`)}>📄 Voir</button>
                    {canWrite && <button className="btn btn-sm" style={{color:'var(--danger)'}} onClick={() => removePiece(p.id)}>🗑️</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Notes internes (privileged only) */}
      {canWrite && a.notes_internes && (
        <div className="paper-card notes-internes-section">
          <h2>🔒 Notes internes</h2>
          <p>{a.notes_internes}</p>
        </div>
      )}

      {/* Popups */}
      {showAddPersonne && <AddPersonnePopup onAdd={addPersonne} onClose={() => setShowAddPersonne(false)} />}
      {showAddPiece && <AddPiecePopup onAdd={addPiece} onClose={() => setShowAddPiece(false)} infractions={infractions} />}
      {showEditAffaire && <EditAffairePopup affaire={a} onSave={updateAffaire} onClose={() => setShowEditAffaire(false)} />}
      {selectedPiece && <PieceViewPopup pieceId={selectedPiece} userId={user?.effectif_id} canWrite={canWrite} onClose={() => setSelectedPiece(null)} onRefresh={load} />}
    </div>
  )

  function loadPieceDetail(pid) { setSelectedPiece(pid) }
}

// ==================== Add Personne ====================
function AddPersonnePopup({ onAdd, onClose }) {
  const [role, setRole] = useState('Accuse')
  const [effectif_id, setEffectifId] = useState('')
  const [effectif_display, setEffectifDisplay] = useState('')
  const [nom_libre, setNomLibre] = useState('')
  const [notes, setNotes] = useState('')
  const [useLibre, setUseLibre] = useState(false)

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" style={{maxWidth:500}} onClick={e => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>✕</button>
        <h2>👥 Ajouter une personne</h2>
        <div className="form-group"><label>Rôle *</label>
          <select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_ICONS[r]} {ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
            <input type="checkbox" checked={useLibre} onChange={e => setUseLibre(e.target.checked)} />
            Personne hors effectifs (nom libre)
          </label>
        </div>
        {useLibre ? (
          <div className="form-group"><label>Nom</label>
            <input className="form-input" value={nom_libre} onChange={e => setNomLibre(e.target.value)} placeholder="Nom complet..." />
          </div>
        ) : (
          <div className="form-group"><label>Effectif</label>
            <EffectifAutocomplete value={effectif_display} onChange={(text, eff) => { setEffectifId(eff?.id || ''); setEffectifDisplay(text) }} placeholder="Rechercher un effectif..." />
          </div>
        )}
        <div className="form-group"><label>Notes</label>
          <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes optionnelles..." />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={() => onAdd({ effectif_id: useLibre ? null : effectif_id, nom_libre: useLibre ? nom_libre : null, role, notes })}>
            Ajouter
          </button>
          <button className="btn" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

// ==================== Add Piece ====================
function AddPiecePopup({ onAdd, onClose, infractions }) {
  const [form, setForm] = useState({
    type: 'Proces-verbal', titre: '', contenu: '', date_rp: '', date_irl: new Date().toISOString().split('T')[0],
    infraction_id: '', infraction_custom: '', confidentiel: false
  })

  const [showDocPicker, setShowDocPicker] = useState(false)
  const [siteDocuments, setSiteDocuments] = useState([])
  const [docSearch, setDocSearch] = useState('')

  const placeholders = {
    'Proces-verbal': 'Décrivez les faits constatés, les circonstances, les personnes présentes...',
    'Temoignage': 'Transcription du témoignage, identité du témoin, conditions de l\'audition...',
    'Decision': 'Verdict rendu, sanctions prononcées, motivations de la décision...',
    'Rapport-infraction': 'Nature de l\'infraction, circonstances, preuves réunies...',
    'Requisitoire': 'Argumentaire de l\'accusation, peines requises...',
    'Note-interne': 'Notes confidentielles de l\'enquête...',
  }

  const loadSiteDocs = async () => {
    if (siteDocuments.length > 0) { setShowDocPicker(true); return }
    try {
      const [rap, med, tel, inter] = await Promise.all([
        api.get('/rapports').catch(() => ({ data: { data: [] } })),
        api.get('/medical').catch(() => ({ data: { data: [] } })),
        api.get('/telegrammes').catch(() => ({ data: { data: [] } })),
        api.get('/interdits').catch(() => ({ data: { data: [] } })),
      ])
      const all = [
        ...(rap.data.data || []).map(r => ({ id: r.id, type: '📋 Rapport', label: r.titre || r.type, sub: `${r.auteur_nom || ''} — ${r.date_rp || ''}`, ref: `Rapport #${r.numero || r.id}` })),
        ...(med.data.data || []).map(r => ({ id: r.id, type: '🏥 Visite', label: `${r.effectif_prenom || ''} ${r.effectif_nom || ''}`, sub: r.date_visite_rp || '', ref: `Visite #${r.id}` })),
        ...(tel.data.data || []).map(r => ({ id: r.id, type: '📨 Télégramme', label: r.objet || r.numero, sub: `${r.expediteur_texte || ''} → ${r.destinataire_texte || ''}`, ref: r.numero })),
        ...(inter.data.data || []).map(r => ({ id: r.id, type: '⛔ Interdit', label: `${r.effectif_prenom || ''} ${r.effectif_nom || ''}`, sub: r.motif?.slice(0, 60), ref: `Interdit #${r.id}` })),
      ]
      setSiteDocuments(all)
      setShowDocPicker(true)
    } catch {}
  }

  const linkDoc = (doc) => {
    setForm(f => ({
      ...f,
      titre: f.titre || doc.ref,
      contenu: (f.contenu ? f.contenu + '\n\n' : '') + `📎 Document lié : ${doc.type} — ${doc.label}\n${doc.sub || ''}\nRéférence : ${doc.ref}`
    }))
    setShowDocPicker(false)
  }

  const filteredDocs = docSearch
    ? siteDocuments.filter(d => `${d.type} ${d.label} ${d.sub} ${d.ref}`.toLowerCase().includes(docSearch.toLowerCase()))
    : siteDocuments

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" style={{maxWidth:700,maxHeight:'90vh',overflow:'auto'}} onClick={e => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>✕</button>
        <h2>{PIECE_ICONS[form.type]} Nouvelle pièce</h2>
        <div className="form-row">
          <div className="form-group"><label>Type de pièce *</label>
            <select className="form-input" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
              {TYPES_PIECE.map(t => <option key={t} value={t}>{PIECE_ICONS[t]} {t.replace(/-/g,' ')}</option>)}
            </select>
          </div>
          <div className="form-group" style={{flex:2}}><label>Titre *</label>
            <input className="form-input" value={form.titre} onChange={e => setForm(f => ({...f, titre: e.target.value}))} placeholder="Intitulé de la pièce..." />
          </div>
        </div>

        {(form.type === 'Rapport-infraction' || form.type === 'Proces-verbal') && (
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}><label>Infraction (Code Pénal ou personnalisée)</label>
              <InfractionSearch
                infractions={infractions}
                value={form.infraction_id ? infractions.find(i => String(i.id) === String(form.infraction_id))?.nom || '' : form.infraction_custom}
                onSelect={(inf) => setForm(f => ({...f, infraction_id: inf.id, infraction_custom: ''}))}
                onCustom={(text) => setForm(f => ({...f, infraction_id: '', infraction_custom: text}))}
              />
            </div>
          </div>
        )}

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label>Contenu</label>
            <button type="button" className="btn btn-sm btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={loadSiteDocs}>📎 Lier un document du site</button>
          </div>
          <textarea className="form-input piece-textarea" rows={10} value={form.contenu}
            onChange={e => setForm(f => ({...f, contenu: e.target.value}))}
            placeholder={placeholders[form.type] || 'Contenu de la pièce...'} />
        </div>
        {showDocPicker && (
          <div style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>📎 Documents du site</strong>
              <button className="btn btn-sm" onClick={() => setShowDocPicker(false)}>✕</button>
            </div>
            <input className="form-input" value={docSearch} onChange={e => setDocSearch(e.target.value)} placeholder="🔍 Rechercher..." style={{ marginBottom: '0.5rem' }} />
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {filteredDocs.slice(0, 15).map((d, i) => (
                <div key={`${d.type}-${d.id}-${i}`} onClick={() => linkDoc(d)}
                  style={{ padding: '0.4rem 0.6rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(107,143,60,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <span style={{ fontWeight: 600 }}>{d.type}</span> {d.label}
                  {d.sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{d.sub}</div>}
                </div>
              ))}
              {filteredDocs.length === 0 && <p style={{ textAlign: 'center', color: '#999', padding: '0.5rem' }}>Aucun résultat</p>}
            </div>
          </div>
        )}
        <div className="form-row">
          <div className="form-group"><label>Date RP</label><input className="form-input" value={form.date_rp} onChange={e => setForm(f => ({...f, date_rp: e.target.value}))} placeholder="Ex: 12 Juin 1944" /></div>
          <div className="form-group"><label>Date IRL</label><input type="date" className="form-input" value={form.date_irl} onChange={e => setForm(f => ({...f, date_irl: e.target.value}))} /></div>
          <div className="form-group" style={{display:'flex',alignItems:'end'}}>
            <label style={{display:'flex',gap:'0.5rem',alignItems:'center',cursor:'pointer'}}>
              <input type="checkbox" checked={form.confidentiel} onChange={e => setForm(f => ({...f, confidentiel: e.target.checked}))} /> 🔒 Confidentiel
            </label>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={() => onAdd(form)}>📄 Ajouter au dossier</button>
          <button className="btn" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

// ==================== Piece View ====================
function PieceViewPopup({ pieceId, userId, canWrite, onClose, onRefresh }) {
  const [piece, setPiece] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddSig, setShowAddSig] = useState(false)
  const [showSignCanvas, setShowSignCanvas] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => { loadPiece() }, [pieceId])
  const loadPiece = async () => {
    setLoading(true)
    try { const res = await api.get(`/affaires/pieces/${pieceId}`); setPiece(res.data) }
    catch (err) { console.error(err) }
    setLoading(false)
  }

  const addSignatureSlot = async (data) => {
    try {
      const res = await api.post(`/affaires/pieces/${pieceId}/signatures`, data)
      setShowAddSig(false)
      // Auto-send telegram if effectif selected
      if (data.effectif_id && data.sendTelegram) {
        try {
          const sigId = res.data?.data?.id || res.data?.id
          if (sigId) {
            const telRes = await api.post(`/affaires/signatures/${sigId}/telegram`)
            setMessage(`✅ Signature ajoutée + 📨 Télégramme ${telRes.data.telegramme} envoyé`)
          }
        } catch { setMessage('✅ Signature ajoutée (télégramme échoué)') }
      } else {
        setMessage('✅ Signature ajoutée')
      }
      setTimeout(() => setMessage(''), 4000)
      loadPiece()
    } catch (err) { setMessage('Erreur') }
  }

  const signDocument = async (sigId, signatureData) => {
    try {
      await api.put(`/affaires/signatures/${sigId}/sign`, { signature_data: signatureData })
      setShowSignCanvas(null)
      loadPiece()
      onRefresh()
    } catch (err) { setMessage(err.response?.data?.error || 'Erreur') }
  }

  const sendTelegram = async (sigId) => {
    try {
      const res = await api.post(`/affaires/signatures/${sigId}/telegram`)
      setMessage(`📨 Télégramme ${res.data.telegramme} envoyé !`)
      loadPiece()
    } catch (err) { setMessage(err.response?.data?.error || 'Erreur') }
  }

  if (loading) return <div className="popup-overlay"><div className="popup-content"><p>Chargement...</p></div></div>
  if (!piece) return null
  const p = piece

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content piece-view-popup" onClick={e => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>✕</button>
        {message && <div className="alert alert-success" style={{marginBottom:'0.5rem'}}>{message}</div>}

        <div className="piece-document" id="piece-doc-print">
          <div className="piece-doc-header">
            <span className="piece-type-badge">{PIECE_ICONS[p.type]} {p.type.replace(/-/g,' ')}</span>
            {p.confidentiel && <span className="piece-confidentiel">🔒 CONFIDENTIEL</span>}
          </div>
          <h2 className="piece-doc-title">{p.titre}</h2>
          {p.infraction_nom && (
            <div className="piece-infraction">
              <strong>Infraction:</strong> {p.infraction_nom} (Groupe {p.infraction_groupe})
              {p.infraction_desc && <div className="text-muted">{p.infraction_desc}</div>}
            </div>
          )}
          {p.infraction_custom && <div className="piece-infraction"><strong>Infraction:</strong> {p.infraction_custom}</div>}

          <div className="piece-doc-content">{p.contenu || <em className="text-muted">Aucun contenu</em>}</div>

          <div className="piece-doc-footer">
            {p.date_rp && <span>Date RP: {p.date_rp}</span>}
            {p.date_irl && <span>Date: {formatDate(p.date_irl)}</span>}
            {p.redige_par_nom && <span>Rédigé par: {p.redige_par_nom}</span>}
          </div>

          {/* Signatures section */}
          <div className="piece-signatures">
            <div className="section-header">
              <h3>✍️ Signatures ({p.signatures.length})</h3>
              {canWrite && <button className="btn btn-sm" onClick={() => setShowAddSig(true)}>+ Case signature</button>}
            </div>
            {p.signatures.length === 0 ? (
              <p className="text-muted" style={{fontSize:'0.85rem'}}>Aucune signature requise</p>
            ) : (
              <div className="signatures-list">
                {p.signatures.map(s => (
                  <div key={s.id} className={`signature-slot ${s.signe ? 'signed' : 'unsigned'}`}>
                    <div className="sig-info">
                      <strong>{s.effectif_prenom ? `${s.effectif_prenom} ${s.effectif_nom}` : s.nom_signataire || '—'}</strong>
                      {s.role_signataire && <span className="sig-role">{s.role_signataire}</span>}
                    </div>
                    {s.signe ? (
                      <div className="sig-canvas-display">
                        <img src={s.signature_data} alt="Signature" />
                        <div className="sig-date">Signé le {formatDateTime(s.date_signature)}</div>
                      </div>
                    ) : (
                      <div className="sig-actions">
                        <div className="sig-placeholder">[ EN ATTENTE DE SIGNATURE ]</div>
                        {(s.effectif_id === userId || canWrite) && (
                          <button className="btn btn-sm btn-primary" onClick={() => setShowSignCanvas(s.id)}>✍️ Signer</button>
                        )}
                        {canWrite && !s.telegramme_envoye && s.effectif_id && (
                          <button className="btn btn-sm" onClick={() => sendTelegram(s.id)}>📨 Envoyer télégramme</button>
                        )}
                        {s.telegramme_envoye && <span className="sig-telegram-sent">📨 Télégramme envoyé</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
          <button className="btn btn-secondary btn-small" onClick={() => exportToPdf('piece-doc-print', `Piece_${p.titre?.replace(/\s/g,'_')}`)}>📄 PDF</button>
          <button className="btn btn-secondary btn-small" onClick={() => window.print()}>🖨️ Imprimer</button>
        </div>

        {showAddSig && <AddSignatureSlot onAdd={addSignatureSlot} onClose={() => setShowAddSig(false)} />}
        {showSignCanvas && <SignatureCanvas sigId={showSignCanvas} onSign={signDocument} onClose={() => setShowSignCanvas(null)} />}
      </div>
    </div>
  )
}

// ==================== Add Signature Slot ====================
function AddSignatureSlot({ onAdd, onClose }) {
  const [effectif_id, setEffectifId] = useState('')
  const [effectif_display, setEffectifDisplay] = useState('')
  const [nom_signataire, setNom] = useState('')
  const [role_signataire, setRole] = useState('')
  const [useLibre, setUseLibre] = useState(false)
  const [sendTelegram, setSendTelegram] = useState(true)

  return (
    <div style={{marginTop:'1rem',padding:'1rem',background:'rgba(0,0,0,0.03)',borderRadius:6}}>
      <h4>Ajouter une case signature</h4>
      <div className="form-group">
        <label><input type="checkbox" checked={useLibre} onChange={e => setUseLibre(e.target.checked)} /> Nom libre (pas de télégramme)</label>
      </div>
      {useLibre ? (
        <div className="form-group"><input className="form-input" value={nom_signataire} onChange={e => setNom(e.target.value)} placeholder="Nom du signataire..." /></div>
      ) : (
        <>
          <div className="form-group">
            <EffectifAutocomplete value={effectif_display} onChange={(text, eff) => { setEffectifId(eff?.id || ''); setEffectifDisplay(text); setNom(text) }} placeholder="Effectif..." />
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={sendTelegram} onChange={e => setSendTelegram(e.target.checked)} />
              📨 Envoyer un télégramme de demande de signature
            </label>
          </div>
        </>
      )}
      <div className="form-group"><input className="form-input" value={role_signataire} onChange={e => setRole(e.target.value)} placeholder="Rôle (Ex: Enquêteur, Témoin, Juge...)" /></div>
      <div style={{display:'flex',gap:'0.5rem'}}>
        <button className="btn btn-sm btn-primary" onClick={() => onAdd({ effectif_id: useLibre ? null : effectif_id, nom_signataire: useLibre ? nom_signataire : effectif_display, role_signataire, sendTelegram: !useLibre && sendTelegram })}>
          {!useLibre && sendTelegram ? '✍️📨 Ajouter + Télégramme' : '✍️ Ajouter'}
        </button>
        <button className="btn btn-sm" onClick={onClose}>Annuler</button>
      </div>
    </div>
  )
}

// ==================== Signature Canvas (Paint-style) ====================
function SignatureCanvas({ sigId, onSign, onClose }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasContent, setHasContent] = useState(false)

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const touch = e.touches ? e.touches[0] : e
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }

  const startDraw = (e) => {
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
  }

  const draw = (e) => {
    if (!drawing) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
    setHasContent(true)
  }

  const stopDraw = () => setDrawing(false)

  const clear = () => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setHasContent(false)
  }

  const submit = () => {
    if (!hasContent) return
    const data = canvasRef.current.toDataURL('image/png')
    onSign(sigId, data)
  }

  return (
    <div className="popup-overlay" onClick={onClose} style={{zIndex:1100}}>
      <div className="popup-content signature-canvas-popup" onClick={e => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>✕</button>
        <h3>✍️ Apposez votre signature</h3>
        <p className="text-muted" style={{fontSize:'0.8rem'}}>Dessinez votre signature ci-dessous. Elle sera sauvegardée pour vos futurs documents.</p>
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="signature-canvas"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        <div className="form-actions">
          <button className="btn btn-primary" onClick={submit} disabled={!hasContent}>✅ Signer</button>
          <button className="btn" onClick={clear}>🗑️ Effacer</button>
          <button className="btn" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

// ==================== Edit Affaire ====================
function EditAffairePopup({ affaire, onSave, onClose }) {
  const [form, setForm] = useState({ ...affaire })
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" style={{maxWidth:650,maxHeight:'90vh',overflow:'auto'}} onClick={e => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>✕</button>
        <h2>✏️ Modifier l'affaire</h2>
        <div className="form-group"><label>Titre</label><input className="form-input" value={form.titre} onChange={e => setForm(f => ({...f, titre: e.target.value}))} /></div>
        <div className="form-row">
          <div className="form-group"><label>Type</label><select className="form-input" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>{['Enquete','Proces','Disciplinaire','Administrative'].map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label>Statut</label><select className="form-input" value={form.statut} onChange={e => setForm(f => ({...f, statut: e.target.value}))}>{STATUTS.map(s => <option key={s}>{s}</option>)}</select></div>
          <div className="form-group"><label>Gravité</label><select className="form-input" value={form.gravite} onChange={e => setForm(f => ({...f, gravite: parseInt(e.target.value)}))}>{[1,2,3,4,5].map(g => <option key={g} value={g}>Grp {g}</option>)}</select></div>
        </div>
        <div className="form-group"><label>Résumé</label><textarea className="form-input" rows={3} value={form.resume || ''} onChange={e => setForm(f => ({...f, resume: e.target.value}))} /></div>
        <div className="form-group"><label>⚖️ Verdict</label><textarea className="form-input" rows={2} value={form.verdict || ''} onChange={e => setForm(f => ({...f, verdict: e.target.value}))} placeholder="Décision du tribunal..." /></div>
        <div className="form-group"><label>🔨 Sanction prononcée</label><textarea className="form-input" rows={2} value={form.sanction_prononcee || ''} onChange={e => setForm(f => ({...f, sanction_prononcee: e.target.value}))} placeholder="Peine appliquée..." /></div>
        <div className="form-row">
          <div className="form-group"><label>Clôture RP</label><input className="form-input" value={form.date_cloture_rp || ''} onChange={e => setForm(f => ({...f, date_cloture_rp: e.target.value}))} /></div>
          <div className="form-group"><label>Clôture IRL</label><input type="date" className="form-input" value={form.date_cloture_irl || ''} onChange={e => setForm(f => ({...f, date_cloture_irl: e.target.value}))} /></div>
        </div>
        <div className="form-group"><label>🔒 Notes internes</label><textarea className="form-input" rows={2} value={form.notes_internes || ''} onChange={e => setForm(f => ({...f, notes_internes: e.target.value}))} /></div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={() => onSave(form)}>💾 Sauvegarder</button>
          <button className="btn" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

// ==================== Infraction Search ====================
function InfractionSearch({ infractions, value, onSelect, onCustom }) {
  const [text, setText] = useState(value || '')
  const [open, setOpen] = useState(false)

  useEffect(() => { setText(value || '') }, [value])

  const filtered = infractions.filter(i =>
    `${i.nom} ${i.description || ''} Grp ${i.groupe}`.toLowerCase().includes(text.toLowerCase())
  ).slice(0, 10)

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="form-input"
        value={text}
        onChange={e => { setText(e.target.value); setOpen(true); onCustom(e.target.value) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="🔍 Rechercher une infraction ou saisir librement..."
      />
      {open && text.length > 0 && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#faf8f2', border: '2px solid var(--border-color)',
          borderRadius: 'var(--border-radius)', maxHeight: 220, overflowY: 'auto',
          boxShadow: 'var(--shadow-medium)'
        }}>
          {filtered.map(i => (
            <div key={i.id}
              onMouseDown={() => { onSelect(i); setText(i.nom); setOpen(false) }}
              style={{
                padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem',
                borderBottom: '1px solid var(--border-color)', transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(107,143,60,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <strong>[Grp {i.groupe}]</strong> {i.nom}
              {i.sanction_min && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 8 }}>({i.sanction_min})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
