import BackButton from '../../components/BackButton'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../auth/useAuth'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'
import { exportCsv } from '../../utils/exportCsv'
import './telegrammes.css'

const PRIORITY_ICONS = { Normal: '📨', Urgent: '🔴', Secret: '🔒', 'Sehr Geheim': '☠️' }

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Telegrammes() {
  const { user } = useAuth()
  const [tab, setTab] = useState('tous')
  const [telegrammes, setTelegrammes] = useState([])
  const [unread, setUnread] = useState(0)
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ destinataires: [], objet: '', contenu: '', priorite: 'Normal', prive: false })
  const [destInput, setDestInput] = useState('')
  const [message, setMessage] = useState(null)

  const hasEffectif = !!user?.effectif_id
  const isPrivileged = user?.isAdmin || user?.isOfficier || user?.isRecenseur

  useEffect(() => { load() }, [tab])

  const load = async () => {
    try {
      const res = await api.get('/telegrammes', { params: { tab } })
      setTelegrammes(res.data.data || [])
      setUnread(res.data.unread || 0)
    } catch (err) { console.error(err) }
  }

  const openTel = async (t) => {
    // Privé: only sender/receiver/privileged can open
    if (t.prive && t.expediteur_id !== user?.effectif_id && !(t.destinataires || []).some(d => d.effectif_id === user?.effectif_id) && !isPrivileged) {
      return
    }
    try {
      const res = await api.get(`/telegrammes/${t.id}`)
      setSelected(res.data.data)
      load()
    } catch (err) { console.error(err) }
  }

  const archiver = async (id) => {
    try {
      await api.put(`/telegrammes/${id}/archiver`)
      setSelected(null)
      load()
    } catch (err) { console.error(err) }
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/telegrammes', { ...form, destinataires: form.destinataires })
      setForm({ destinataires: [], objet: '', contenu: '', priorite: 'Normal', prive: false }); setDestInput('')
      setShowForm(false)
      setMessage({ type: 'success', text: `Télégramme ${res.data.data.numero} envoyé ✓` })
      setTimeout(() => setMessage(null), 3000)
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const handleDestSelect = (eff) => {
    const entry = { effectif_id: eff.id, nom_libre: `${eff.prenom} ${eff.nom}` }
    if (!form.destinataires.some(d => d.effectif_id === eff.id)) {
      setForm(p => ({ ...p, destinataires: [...p.destinataires, entry] }))
    }
    setDestInput('')
  }
  const addFreeTextDest = () => {
    if (!destInput.trim()) return
    setForm(p => ({ ...p, destinataires: [...p.destinataires, { effectif_id: null, nom_libre: destInput.trim() }] }))
    setDestInput('')
  }
  const removeDest = (i) => setForm(p => ({ ...p, destinataires: p.destinataires.filter((_, j) => j !== i) }))

  // View: telegram detail popup
  if (selected) {
    const t = selected
    return (
      <div className="container telegrammes-page">
        <div style={{ marginBottom: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-small" onClick={() => setSelected(null)}>← Retour</button>
          {hasEffectif && t.expediteur_id !== user?.effectif_id && (
            <button className="btn btn-primary btn-small" onClick={() => {
              setForm({
                destinataires: [{ effectif_id: t.expediteur_id, nom_libre: t.expediteur_nom }],
                objet: `RE: ${t.objet}`,
                contenu: '',
                priorite: t.priorite,
                prive: !!t.prive
              })
              setSelected(null)
              setShowForm(true)
            }}>↩️ Répondre</button>
          )}
          {(t.expediteur_id === user?.effectif_id || t.destinataire_id === user?.effectif_id) && (
            <button className="btn btn-secondary btn-small" onClick={() => archiver(t.id)}>📦 Archiver</button>
          )}
          {user?.isAdmin && (
            <button className="btn btn-danger btn-small" onClick={async () => {
              if (!confirm('Supprimer ce télégramme ?')) return
              try { await api.delete(`/telegrammes/${t.id}`); setSelected(null); load() } catch (err) { alert(err.response?.data?.message || 'Erreur') }
            }}>🗑️ Supprimer</button>
          )}
        </div>

        <div className="telegram-paper">
          <div className={`telegram-stamp telegram-stamp-${t.priorite}`}>{t.priorite}</div>
          {t.prive && <div className="telegram-prive-badge">🔒 PRIVÉ</div>}
          <div className="telegram-header-block">
            <h2>⚡ TELEGRAMM</h2>
            <div className="tel-numero">{t.numero}</div>
          </div>

          <div className="telegram-fields">
            <span className="telegram-field-label">DE :</span>
            <span className="telegram-field-value">{t.expediteur_grade ? `${t.expediteur_grade} ` : ''}{t.expediteur_nom} {t.expediteur_unite ? `[${t.expediteur_unite}]` : ''}</span>
            <span className="telegram-field-label">À :</span>
            <span className="telegram-field-value">{t.destinataires?.length ? t.destinataires.map(d => d.nom_libre || `${d.prenom || ''} ${d.nom || ''}`.trim()).join(', ') : (t.destinataire_nom || '—')}</span>
            <span className="telegram-field-label">OBJET :</span>
            <span className="telegram-field-value">{t.objet}</span>
            <span className="telegram-field-label">DATE :</span>
            <span className="telegram-field-value">{formatDate(t.created_at)}</span>
            <span className="telegram-field-label">PRIORITÉ :</span>
            <span className="telegram-field-value"><span className={`tel-priorite tel-priorite-${t.priorite}`}>{PRIORITY_ICONS[t.priorite]} {t.priorite}</span></span>
          </div>

          <TelegramBody contenu={t.contenu} user={user} onRefresh={load} />

          <div className="telegram-footer">
            <span>Statut : {t.statut}</span>
            {t.lu_at && <span>Lu le {formatDate(t.lu_at)}</span>}
          </div>
        </div>
      </div>
    )
  }

  // View: new telegram form
  if (showForm) {
    return (
      <div className="container telegrammes-page">
        <button className="btn btn-secondary btn-small" onClick={() => setShowForm(false)} style={{ marginBottom: 'var(--space-md)' }}>← Retour</button>
        <h2 style={{ marginBottom: 'var(--space-lg)' }}>⚡ Nouveau Télégramme</h2>

        <div className="tel-form">
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Destinataire(s) *</label>
              {form.destinataires.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                  {form.destinataires.map((d, i) => (
                    <span key={i} style={{ background: 'var(--military-green)', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {d.nom_libre}
                      <button type="button" onClick={() => removeDest(i)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', lineHeight: 1 }}>✕</button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <EffectifAutocomplete
                    value={destInput}
                    onChange={val => setDestInput(val)}
                    onSelect={handleDestSelect}
                    placeholder="Rechercher un effectif..."
                  />
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addFreeTextDest} title="Ajouter en texte libre">+</button>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sélectionnez ou tapez un nom puis cliquez + pour ajouter plusieurs destinataires</span>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Objet *</label>
                <input type="text" className="form-input" value={form.objet} onChange={e => setForm(p => ({...p, objet: e.target.value}))} required placeholder="Objet du télégramme..." />
              </div>
              <div className="form-group">
                <label className="form-label">Priorité</label>
                <select className="form-input" value={form.priorite} onChange={e => setForm(p => ({...p, priorite: e.target.value}))}>
                  <option value="Normal">📨 Normal</option>
                  <option value="Urgent">🔴 Urgent</option>
                  <option value="Secret">🔒 Secret</option>
                  <option value="Sehr Geheim">☠️ Sehr Geheim</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Message *</label>
              <textarea className="form-input form-textarea" value={form.contenu} onChange={e => setForm(p => ({...p, contenu: e.target.value}))} required placeholder="Contenu du télégramme..." rows={8} />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="prive-check" checked={form.prive} onChange={e => setForm(p => ({...p, prive: e.target.checked}))} />
              <label htmlFor="prive-check" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                🔒 Télégramme privé <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(visible uniquement par l'expéditeur et le destinataire)</span>
              </label>
            </div>

            <button type="submit" className="btn btn-primary">⚡ Envoyer le télégramme</button>
          </form>
        </div>
      </div>
    )
  }

  // View: list as TABLE
  return (
    <div className="container telegrammes-page">
      <BackButton label="← Tableau de bord" />
      <div className="telegrammes-header">
        <h1>⚡ Télégrammes</h1>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {user?.isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => exportCsv(telegrammes, [
            { key: 'numero', label: 'N°' }, { key: 'priorite', label: 'Priorité' },
            { key: 'expediteur_nom', label: 'De' }, { key: 'destinataire_nom', label: 'À' },
            { key: 'objet', label: 'Objet' }, { key: r => formatDate(r.created_at), label: 'Date' }
          ], 'Telegrammes')}>📥 CSV</button>}
          {hasEffectif && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Nouveau télégramme</button>
          )}
        </div>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="tel-tabs">
        <button className={`tel-tab ${tab === 'tous' ? 'active' : ''}`} onClick={() => setTab('tous')}>
          📋 Tous
        </button>
        {hasEffectif && (
          <button className={`tel-tab ${tab === 'recu' ? 'active' : ''}`} onClick={() => setTab('recu')}>
            📥 Mes reçus {unread > 0 && <span className="badge-count">{unread}</span>}
          </button>
        )}
        {hasEffectif && (
          <button className={`tel-tab ${tab === 'envoye' ? 'active' : ''}`} onClick={() => setTab('envoye')}>📤 Mes envoyés</button>
        )}
        {hasEffectif && (
          <button className={`tel-tab ${tab === 'archive' ? 'active' : ''}`} onClick={() => setTab('archive')}>📦 Archives</button>
        )}
      </div>

      {telegrammes.length > 0 ? (
        <div className="paper-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={th}>N°</th>
                <th style={th}>Priorité</th>
                <th style={th}>De</th>
                <th style={th}>À</th>
                <th style={th}>Objet</th>
                <th style={th}>Date</th>
                <th style={th}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {telegrammes.map(t => {
                const isUnread = t.destinataire_id === user?.effectif_id && (t.statut === 'Envoyé' || t.statut === 'Reçu')
                const isPrive = !!t.prive
                const canView = !isPrive || t.expediteur_id === user?.effectif_id || t.destinataire_id === user?.effectif_id || isPrivileged

                return (
                  <tr key={t.id}
                    onClick={() => canView && openTel(t)}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      cursor: canView ? 'pointer' : 'default',
                      fontWeight: isUnread ? 700 : 400,
                      background: isUnread ? 'rgba(107,143,60,0.06)' : '',
                      opacity: !canView ? 0.5 : 1,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={ev => { if (canView) ev.currentTarget.style.background = 'var(--military-light, rgba(107,143,60,0.08))' }}
                    onMouseLeave={ev => ev.currentTarget.style.background = isUnread ? 'rgba(107,143,60,0.06)' : ''}
                  >
                    <td style={td}><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{t.numero}</span></td>
                    <td style={td}>
                      <span className={`tel-priorite tel-priorite-${t.priorite}`}>
                        {PRIORITY_ICONS[t.priorite]} {t.priorite}
                      </span>
                    </td>
                    <td style={td}>{isPrive && !canView ? '—' : t.expediteur_nom}</td>
                    <td style={td}>{isPrive && !canView ? '—' : t.destinataire_nom}</td>
                    <td style={td}>
                      {isPrive && <span style={{ fontSize: '0.7rem', marginRight: 4 }}>🔒</span>}
                      {isPrive && !canView ? <em style={{ color: 'var(--text-muted)' }}>Télégramme privé</em> : t.objet}
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{formatDate(t.created_at)}</td>
                    <td style={td}>
                      {isUnread && <span style={{ fontSize: '0.7rem', background: 'var(--military-green)', color: 'white', padding: '1px 6px', borderRadius: 8 }}>Nouveau</span>}
                      {!isUnread && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.statut}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p className="text-muted">Aucun télégramme</p>
        </div>
      )}
    </div>
  )
}

// ===== Telegram body with signature support =====
function TelegramBody({ contenu, user, onRefresh }) {
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const [showSign, setShowSign] = useState(false)
  const [signMsg, setSignMsg] = useState('')
  const [signed, setSigned] = useState(false)

  // Detect affaire signature request: <!--SIG:sigId:affaireId:pieceId-->
  const sigMatch = contenu?.match(/<!--SIG:(\d+):(\d*):(\d*)-->/)
  const sigId = sigMatch?.[1]
  const affaireId = sigMatch?.[2]

  // Detect soldbuch signature request: <!--SOLDBUCH_SIGN:effectifId:slot-->
  const sbMatch = contenu?.match(/<!--SOLDBUCH_SIGN:(\d+):(\w+)-->/)
  const sbEffectifId = sbMatch?.[1]
  const sbSlot = sbMatch?.[2]

  const displayContent = contenu?.replace(/<!--SIG:\d+:\d*:\d*-->/, '').replace(/<!--SOLDBUCH_SIGN:\d+:\w+-->/, '').trim()

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const touch = e.touches ? e.touches[0] : e
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }

  const startDraw = (e) => { e.preventDefault(); const ctx = canvasRef.current.getContext('2d'); const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); setDrawing(true) }
  const draw = (e) => { if (!drawing) return; e.preventDefault(); const ctx = canvasRef.current.getContext('2d'); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(); setHasContent(true) }
  const stopDraw = () => setDrawing(false)
  const clearCanvas = () => { canvasRef.current.getContext('2d').clearRect(0, 0, 400, 120); setHasContent(false) }

  const submitSignature = async () => {
    if (!hasContent) return
    const data = canvasRef.current.toDataURL('image/png')
    try {
      if (sbEffectifId) {
        // Soldbuch signature
        await api.put(`/soldbuch/${sbEffectifId}/sign`, { slot: sbSlot, signature_data: data })
      } else if (sigId) {
        // Affaire signature
        await api.put(`/affaires/signatures/${sigId}/sign`, { signature_data: data })
      }
      setSignMsg('✅ Document signé avec succès !')
      setSigned(true)
      setShowSign(false)
      if (onRefresh) onRefresh()
    } catch (err) {
      setSignMsg('❌ ' + (err.response?.data?.message || err.response?.data?.error || 'Erreur'))
    }
  }

  return (
    <div>
      <div className="telegram-body">{displayContent}</div>
      {(sigId || sbEffectifId) && !signed && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(107,143,60,0.08)', border: '1px solid rgba(107,143,60,0.3)', borderRadius: 6 }}>
          {!showSign ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-small" onClick={() => setShowSign(true)}>✍️ Signer directement</button>
              {affaireId && <button className="btn btn-secondary btn-small" onClick={() => navigate(`/sanctions/${affaireId}`)}>📁 Voir l'affaire</button>}
              {sbEffectifId && <button className="btn btn-secondary btn-small" onClick={() => navigate(`/effectifs/${sbEffectifId}/soldbuch`)}>📖 Voir le Soldbuch</button>}
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>Dessinez votre signature ci-dessous :</p>
              <canvas ref={canvasRef} width={400} height={120}
                style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 4, cursor: 'crosshair', display: 'block', touchAction: 'none', maxWidth: '100%' }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn btn-primary btn-small" onClick={submitSignature} disabled={!hasContent}>✅ {sbEffectifId ? 'Signer le Soldbuch' : 'Valider la signature'}</button>
                <button className="btn btn-small" onClick={clearCanvas}>🗑️ Effacer</button>
                <button className="btn btn-small" onClick={() => setShowSign(false)}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      )}
      {signed && <div className="alert alert-success" style={{ marginTop: '0.5rem' }}>✅ Document signé avec succès !</div>}
      {signMsg && !signed && <div className="alert alert-danger" style={{ marginTop: '0.5rem' }}>{signMsg}</div>}
    </div>
  )
}

const th = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)', whiteSpace: 'nowrap' }
const td = { padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'middle' }
