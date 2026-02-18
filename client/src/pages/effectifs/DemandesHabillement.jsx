import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'

const STATUT_LABELS = { en_attente: '🟡 En attente', approuve: '🟢 Approuvé', refuse: '🔴 Refusé' }
const STATUT_COLORS = { en_attente: '#f39c12', approuve: '#27ae60', refuse: '#e74c3c' }

export default function DemandesHabillement() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [reponse, setReponse] = useState('')
  const [message, setMessage] = useState(null)

  const isOfficier = user?.isOfficier || user?.isAdmin
  const canValidate = isOfficier // Only officers validate — administratifs transmit only

  const load = async () => {
    try {
      const res = await api.get('/habillement/demandes')
      setItems(res.data.data || [])
    } catch {}
  }
  useEffect(() => { load() }, [])

  const validate = async (id, statut) => {
    try {
      await api.put(`/habillement/demandes/${id}/validate`, { statut, reponse })
      setMessage({ type: 'success', text: statut === 'approuve' ? 'Demande approuvée' : 'Demande refusée' })
      setSelected(null)
      setReponse('')
      load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' })
    }
  }

  const pending = items.filter(d => d.statut === 'en_attente')
  const processed = items.filter(d => d.statut !== 'en_attente')

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <BackButton />
        <h2 style={{ margin: 0 }}>👔 Demandes d'habillement</h2>
        <div />
      </div>

      {message && <div className={`alert alert-${message.type}`} style={{ marginBottom: 'var(--space-md)' }}>{message.text}</div>}

      {/* Popup validation */}
      {selected && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-xl)', border: '2px solid var(--military-green)' }}>
          <h3>📋 Demande #{selected.id}</h3>
          <p><strong>Demandeur :</strong> {selected.effectif_nom || `Effectif #${selected.effectif_id}`}</p>
          <p><strong>Description :</strong> {selected.description}</p>
          {selected.motif && <p><strong>Motif :</strong> {selected.motif}</p>}
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Soumise le {new Date(selected.created_at).toLocaleDateString('fr-FR')}</p>

          {canValidate && selected.statut === 'en_attente' ? (
            <>
              <div className="form-group">
                <label className="form-label">Réponse / commentaire (optionnel)</label>
                <textarea className="form-input" rows={2} value={reponse} onChange={e => setReponse(e.target.value)} placeholder="Réponse à transmettre au demandeur..." />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" style={{ background: '#27ae60', color: 'white' }} onClick={() => validate(selected.id, 'approuve')}>✅ Approuver</button>
                <button className="btn" style={{ background: '#e74c3c', color: 'white' }} onClick={() => validate(selected.id, 'refuse')}>❌ Refuser</button>
                <button className="btn btn-secondary" onClick={() => { setSelected(null); setReponse('') }}>Annuler</button>
              </div>
            </>
          ) : (
            <>
              <p><strong>Statut :</strong> <span style={{ color: STATUT_COLORS[selected.statut] }}>{STATUT_LABELS[selected.statut]}</span></p>
              {selected.reponse && <p><strong>Réponse :</strong> {selected.reponse}</p>}
              {selected.traite_par_nom && <p><strong>Traité par :</strong> {selected.traite_par_nom}</p>}
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Fermer</button>
            </>
          )}
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3>🟡 En attente ({pending.length})</h3>
          <table className="table">
            <thead><tr><th>N°</th><th>Demandeur</th><th>Description</th><th>Date</th></tr></thead>
            <tbody>
              {pending.map(d => (
                <tr key={d.id} onClick={() => setSelected(d)} style={{ cursor: 'pointer' }} className="table-row-hover">
                  <td>DH-{String(d.id).padStart(3, '0')}</td>
                  <td style={{ fontWeight: 600 }}>{d.effectif_nom || `#${d.effectif_id}`}</td>
                  <td style={{ fontSize: '0.85rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</td>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Processed */}
      <div className="paper-card">
        <h3>📁 Historique ({processed.length})</h3>
        {processed.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune demande traitée.</p>
        ) : (
          <table className="table">
            <thead><tr><th>N°</th><th>Demandeur</th><th>Description</th><th>Statut</th><th>Traité par</th><th>Date</th></tr></thead>
            <tbody>
              {processed.map(d => (
                <tr key={d.id} onClick={() => setSelected(d)} style={{ cursor: 'pointer' }} className="table-row-hover">
                  <td>DH-{String(d.id).padStart(3, '0')}</td>
                  <td>{d.effectif_nom || `#${d.effectif_id}`}</td>
                  <td style={{ fontSize: '0.85rem', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</td>
                  <td><span style={{ color: STATUT_COLORS[d.statut], fontWeight: 600, fontSize: '0.8rem' }}>{STATUT_LABELS[d.statut]}</span></td>
                  <td style={{ fontSize: '0.8rem' }}>{d.traite_par_nom || '—'}</td>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
