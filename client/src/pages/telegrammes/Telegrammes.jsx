import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import EffectifAutocomplete from '../../components/EffectifAutocomplete'
import './telegrammes.css'

const PRIORITY_ICONS = { Normal: '📨', Urgent: '🔴', Secret: '🔒', 'Sehr Geheim': '☠️' }

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Telegrammes() {
  const { user } = useAuth()
  const [tab, setTab] = useState('recu')
  const [telegrammes, setTelegrammes] = useState([])
  const [unread, setUnread] = useState(0)
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ destinataire_id: '', destinataire_nom: '', destinataire_unite: '', objet: '', contenu: '', priorite: 'Normal' })
  const [message, setMessage] = useState(null)

  const hasEffectif = !!user?.effectif_id

  useEffect(() => { load() }, [tab])

  const load = async () => {
    try {
      const res = await api.get('/telegrammes', { params: { tab } })
      setTelegrammes(res.data.data || [])
      setUnread(res.data.unread || 0)
    } catch (err) { console.error(err) }
  }

  const openTel = async (id) => {
    try {
      const res = await api.get(`/telegrammes/${id}`)
      setSelected(res.data.data)
      // Refresh to update read status
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
      const res = await api.post('/telegrammes', form)
      setForm({ destinataire_id: '', destinataire_nom: '', destinataire_unite: '', objet: '', contenu: '', priorite: 'Normal' })
      setShowForm(false)
      setMessage({ type: 'success', text: `Télégramme ${res.data.data.numero} envoyé ✓` })
      setTimeout(() => setMessage(null), 3000)
      setTab('envoye')
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const handleDestSelect = (eff) => {
    setForm(p => ({ ...p, destinataire_id: eff.id, destinataire_nom: `${eff.prenom} ${eff.nom}`, destinataire_unite: eff.unite_code || '' }))
  }

  // View: telegram detail
  if (selected) {
    const t = selected
    return (
      <div className="container telegrammes-page">
        <div style={{ marginBottom: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary btn-small" onClick={() => setSelected(null)}>← Retour</button>
          <button className="btn btn-secondary btn-small" onClick={() => archiver(t.id)}>📦 Archiver</button>
        </div>

        <div className="telegram-paper">
          <div className={`telegram-stamp telegram-stamp-${t.priorite}`}>{t.priorite}</div>
          <div className="telegram-header-block">
            <h2>⚡ TELEGRAMM</h2>
            <div className="tel-numero">{t.numero}</div>
          </div>

          <div className="telegram-fields">
            <span className="telegram-field-label">DE :</span>
            <span className="telegram-field-value">{t.expediteur_grade ? `${t.expediteur_grade} ` : ''}{t.expediteur_nom} {t.expediteur_unite ? `[${t.expediteur_unite}]` : ''}</span>
            <span className="telegram-field-label">À :</span>
            <span className="telegram-field-value">{t.destinataire_nom} {t.destinataire_unite ? `[${t.destinataire_unite}]` : ''}</span>
            <span className="telegram-field-label">OBJET :</span>
            <span className="telegram-field-value">{t.objet}</span>
            <span className="telegram-field-label">DATE :</span>
            <span className="telegram-field-value">{formatDate(t.created_at)}</span>
            <span className="telegram-field-label">PRIORITÉ :</span>
            <span className="telegram-field-value"><span className={`tel-priorite tel-priorite-${t.priorite}`}>{PRIORITY_ICONS[t.priorite]} {t.priorite}</span></span>
          </div>

          <div className="telegram-body">{t.contenu}</div>

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
              <label className="form-label">Destinataire *</label>
              <EffectifAutocomplete
                value={form.destinataire_nom}
                onChange={val => setForm(p => ({ ...p, destinataire_nom: val, destinataire_id: '' }))}
                onSelect={handleDestSelect}
                placeholder="Rechercher un effectif..."
              />
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

            <button type="submit" className="btn btn-primary">⚡ Envoyer le télégramme</button>
          </form>
        </div>
      </div>
    )
  }

  // View: list
  return (
    <div className="container telegrammes-page">
      <BackButton label="← Tableau de bord" />
      <div className="telegrammes-header">
        <h1>⚡ Télégrammes</h1>
        {hasEffectif && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Nouveau télégramme</button>
        )}
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="tel-tabs">
        <button className={`tel-tab ${tab === 'recu' ? 'active' : ''}`} onClick={() => setTab('recu')}>
          📥 Reçus {unread > 0 && <span className="badge-count">{unread}</span>}
        </button>
        <button className={`tel-tab ${tab === 'envoye' ? 'active' : ''}`} onClick={() => setTab('envoye')}>📤 Envoyés</button>
        {(user?.isAdmin || user?.isOfficier || user?.isRecenseur) && (
          <button className={`tel-tab ${tab === 'tous' ? 'active' : ''}`} onClick={() => setTab('tous')}>📋 Tous</button>
        )}
      </div>

      {telegrammes.length > 0 ? (
        <div className="tel-list">
          {telegrammes.map(t => {
            const isUnread = t.destinataire_id === user?.effectif_id && (t.statut === 'Envoyé' || t.statut === 'Reçu')
            return (
              <div key={t.id}
                className={`tel-card ${isUnread ? 'unread' : ''} ${t.priorite === 'Urgent' ? 'urgent' : ''} ${t.priorite === 'Secret' || t.priorite === 'Sehr Geheim' ? 'secret' : ''}`}
                onClick={() => openTel(t.id)}
              >
                <div className="tel-card-priority">{PRIORITY_ICONS[t.priorite]}</div>
                <div className="tel-card-body">
                  <div className="tel-card-header">
                    <span className="tel-card-numero">{t.numero}</span>
                    <span className="tel-card-date">{formatDate(t.created_at)}</span>
                  </div>
                  <div className="tel-card-objet">{t.objet}</div>
                  <div className="tel-card-meta">
                    De : {t.expediteur_nom} → À : {t.destinataire_nom}
                  </div>
                  <div className="tel-card-preview">{t.contenu}</div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p className="text-muted">Aucun télégramme</p>
        </div>
      )}
    </div>
  )
}
