import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import BackButton from '../../components/BackButton'
import api from '../../api/client'

export default function AdminRegiment() {
  const { user } = useAuth()
  const [effectifs, setEffectifs] = useState([])
  const [unites, setUnites] = useState([])
  const [transfers, setTransfers] = useState([])
  const [dismissals, setDismissals] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('effectifs') // effectifs | transfers | dismissals
  const [message, setMessage] = useState(null)
  const [modal, setModal] = useState(null) // { type: 'transfer'|'dismiss', effectif }
  const [motif, setMotif] = useState('')
  const [toUnite, setToUnite] = useState('')
  const [severity, setSeverity] = useState('simple')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [effRes, unitesRes] = await Promise.all([
        api.get('/regiment/effectifs'),
        api.get('/unites')
      ])
      if (effRes.data.success) setEffectifs(effRes.data.data)
      if (unitesRes.data.success) setUnites(unitesRes.data.data || unitesRes.data)
      // Try fetching transfers and dismissals
      try {
        const [trRes, diRes] = await Promise.all([
          api.get('/regiment/transfers'),
          api.get('/regiment/dismissals')
        ])
        if (trRes.data.success) setTransfers(trRes.data.data)
        if (diRes.data.success) setDismissals(diRes.data.data)
      } catch {}
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const flash = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 4000) }

  const openTransfer = (eff) => {
    setModal({ type: 'transfer', effectif: eff })
    setMotif(''); setToUnite(''); setSeverity('simple')
  }

  const openDismiss = (eff) => {
    setModal({ type: 'dismiss', effectif: eff })
    setMotif(''); setSeverity('simple')
  }

  const submitTransfer = async () => {
    if (!toUnite || motif.length < 10) {
      flash('error', 'Unité de destination et motif (min 10 car.) requis')
      return
    }
    try {
      const { data } = await api.post('/regiment/transfer', {
        effectif_id: modal.effectif.id,
        to_unite_id: parseInt(toUnite),
        motif
      })
      if (data.success) {
        flash('success', data.message)
        setModal(null)
        fetchAll()
      } else flash('error', data.message)
    } catch (e) { flash('error', e.response?.data?.message || 'Erreur') }
  }

  const submitDismiss = async () => {
    if (motif.length < 10) {
      flash('error', 'Motif requis (min 10 caractères)')
      return
    }
    if (!confirm(`Confirmer le renvoi de ${modal.effectif.prenom} ${modal.effectif.nom} ?\n\nMotif : ${motif}`)) return
    try {
      const { data } = await api.post('/regiment/dismiss', {
        effectif_id: modal.effectif.id,
        motif,
        severity
      })
      if (data.success) {
        flash('success', data.message)
        setModal(null)
        fetchAll()
      } else flash('error', data.message)
    } catch (e) { flash('error', e.response?.data?.message || 'Erreur') }
  }

  const handleTransferAction = async (transferId, action) => {
    try {
      const { data } = await api.put(`/regiment/transfers/${transferId}`, { action })
      if (data.success) { flash('success', data.message); fetchAll() }
      else flash('error', data.message)
    } catch (e) { flash('error', e.response?.data?.message || 'Erreur') }
  }

  const reinstate = async (effectifId, name) => {
    if (!confirm(`Réintégrer ${name} ?`)) return
    try {
      const { data } = await api.post(`/regiment/reinstate/${effectifId}`)
      if (data.success) { flash('success', data.message); fetchAll() }
      else flash('error', data.message)
    } catch (e) { flash('error', e.response?.data?.message || 'Erreur') }
  }

  const filtered = effectifs.filter(e => {
    if (!search) return true
    return `${e.prenom} ${e.nom} ${e.grade_nom || ''} ${e.unite_nom || ''}`.toLowerCase().includes(search.toLowerCase())
  })

  const pendingTransfers = transfers.filter(t => t.status === 'pending')

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton label="← Administration" to="/admin/users" />
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>🏛️ Gestion du Régiment</h1>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <TabBtn active={tab === 'effectifs'} onClick={() => setTab('effectifs')}>
          👥 Effectifs ({effectifs.length})
        </TabBtn>
        <TabBtn active={tab === 'transfers'} onClick={() => setTab('transfers')}>
          🔄 Transferts {pendingTransfers.length > 0 && <span style={{ background: '#e74c3c', color: '#fff', borderRadius: '50%', padding: '1px 6px', fontSize: '0.7rem', marginLeft: 4 }}>{pendingTransfers.length}</span>}
        </TabBtn>
        <TabBtn active={tab === 'dismissals'} onClick={() => setTab('dismissals')}>
          🚪 Renvois ({dismissals.length})
        </TabBtn>
      </div>

      {loading ? <div className="paper-card" style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div> : (
        <>
          {/* Effectifs tab */}
          {tab === 'effectifs' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
                <input className="form-input" style={{ maxWidth: 300 }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="paper-card" style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                      <th style={th}>Effectif</th>
                      <th style={th}>Grade</th>
                      <th style={th}>Unité</th>
                      <th style={th}>Statut</th>
                      <th style={th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={td}>
                          <strong>{e.prenom} {e.nom}</strong>
                          {e.username && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{e.username}</div>}
                        </td>
                        <td style={td}>{e.grade_nom || '—'}</td>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', marginRight: 6, verticalAlign: 'middle' }}></span>
                          {e.unite_nom || '—'}
                        </td>
                        <td style={td}>
                          {e.member_status === 'dismissed' ? (
                            <span style={{ color: '#8B0000', fontWeight: 600, fontSize: '0.8rem' }}>🚫 Renvoyé</span>
                          ) : e.member_status === 'transferred' ? (
                            <span style={{ color: '#c9a84c', fontWeight: 600, fontSize: '0.8rem' }}>🔄 Transféré</span>
                          ) : (
                            <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>✅ Actif</span>
                          )}
                        </td>
                        <td style={td}>
                          {e.member_status === 'dismissed' ? (
                            <button className="btn btn-secondary btn-small" style={{ fontSize: '0.7rem' }}
                              onClick={() => reinstate(e.id, `${e.prenom} ${e.nom}`)}>
                              ↩️ Réintégrer
                            </button>
                          ) : (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-small" onClick={() => openTransfer(e)}
                                style={{ fontSize: '0.7rem', background: 'linear-gradient(180deg, #c9a84c, #a88734)', color: '#1a1a1a', border: '1px solid #8B7355', padding: '2px 8px' }}>
                                🔄 Transférer
                              </button>
                              <button className="btn btn-small" onClick={() => openDismiss(e)}
                                style={{ fontSize: '0.7rem', background: 'linear-gradient(180deg, #a83232, #6b1010)', color: '#f5ecd7', border: '1px solid #5a0000', padding: '2px 8px' }}>
                                🚪 Renvoyer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Transfers tab */}
          {tab === 'transfers' && (
            <div className="paper-card" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={th}>Effectif</th>
                    <th style={th}>De → Vers</th>
                    <th style={th}>Motif</th>
                    <th style={th}>Statut</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={td}><strong>{t.effectif_prenom} {t.effectif_nom}</strong></td>
                      <td style={td}>{t.from_unite_nom} → {t.to_unite_nom}</td>
                      <td style={{ ...td, maxWidth: 200, whiteSpace: 'pre-wrap', fontSize: '0.8rem', fontStyle: 'italic' }}>{t.motif}</td>
                      <td style={td}>
                        {t.status === 'pending' && <span style={{ color: '#c9a84c', fontWeight: 600 }}>⏳ En attente</span>}
                        {t.status === 'approved' && <span style={{ color: 'var(--success)' }}>✅ Approuvé</span>}
                        {t.status === 'rejected' && <span style={{ color: '#8B0000' }}>❌ Rejeté</span>}
                      </td>
                      <td style={td}>
                        {t.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-small" style={{ fontSize: '0.7rem', background: '#4a7c3f', color: '#fff', border: 'none', padding: '2px 8px' }}
                              onClick={() => handleTransferAction(t.id, 'approve')}>✅</button>
                            <button className="btn btn-small" style={{ fontSize: '0.7rem', background: '#8B0000', color: '#fff', border: 'none', padding: '2px 8px' }}
                              onClick={() => handleTransferAction(t.id, 'reject')}>❌</button>
                          </div>
                        )}
                        {t.status !== 'pending' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {t.validated_by_name || '—'} · {new Date(t.resolved_at).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {transfers.length === 0 && (
                    <tr><td colSpan="5" style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>Aucun transfert</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Dismissals tab */}
          {tab === 'dismissals' && (
            <div className="paper-card" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={th}>Effectif</th>
                    <th style={th}>Unité</th>
                    <th style={th}>Motif</th>
                    <th style={th}>Sévérité</th>
                    <th style={th}>Par</th>
                    <th style={th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {dismissals.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={td}><strong>{d.effectif_prenom} {d.effectif_nom}</strong></td>
                      <td style={td}>{d.unite_nom}</td>
                      <td style={{ ...td, maxWidth: 200, whiteSpace: 'pre-wrap', fontSize: '0.8rem', fontStyle: 'italic', color: '#5a0000' }}>« {d.motif} »</td>
                      <td style={td}>
                        {d.severity === 'definitive'
                          ? <span style={{ color: '#8B0000', fontWeight: 700 }}>Définitif</span>
                          : <span>Simple</span>}
                      </td>
                      <td style={td}>{d.decided_by_name}</td>
                      <td style={td}>{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                  {dismissals.length === 0 && (
                    <tr><td colSpan="6" style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>Aucun renvoi</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal Transfer / Dismiss */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--paper-bg)', border: `2px solid ${modal.type === 'dismiss' ? '#8B0000' : '#8B7355'}`,
            borderRadius: 'var(--border-radius)', padding: 'var(--space-xl)',
            maxWidth: 480, width: '90%', boxShadow: 'var(--shadow-heavy)'
          }}>
            <h2 style={{ margin: '0 0 var(--space-sm)', textAlign: 'center', color: modal.type === 'dismiss' ? '#8B0000' : 'var(--text-primary)' }}>
              {modal.type === 'transfer' ? '🔄 Transfert' : '🚪 Renvoi'}
            </h2>
            <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 var(--space-lg)' }}>
              {modal.effectif.grade_nom || ''} {modal.effectif.prenom} {modal.effectif.nom} — {modal.effectif.unite_nom}
            </p>

            {modal.type === 'transfer' && (
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Unité de destination</label>
                <select className="form-input" value={toUnite} onChange={e => setToUnite(e.target.value)} required>
                  <option value="">— Sélectionner —</option>
                  {(Array.isArray(unites) ? unites : []).filter(u => u.id !== modal.effectif.unite_id).map(u => (
                    <option key={u.id} value={u.id}>{u.code} — {u.nom}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">Motif <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(min 10 caractères)</span></label>
              <textarea className="form-input" value={motif} onChange={e => setMotif(e.target.value)}
                placeholder={modal.type === 'transfer' ? 'Ex: Transfert pour renfort logistique...' : 'Ex: Insubordination répétée, manquement grave au devoir...'}
                style={{ minHeight: 80, fontFamily: 'var(--font-mono)', background: '#faf3e0', resize: 'vertical' }} />
            </div>

            {modal.type === 'dismiss' && (
              <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                <label className="form-label">Sévérité</label>
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="radio" name="severity" value="simple" checked={severity === 'simple'} onChange={() => setSeverity('simple')} />
                    Renvoi simple
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem', color: '#8B0000' }}>
                    <input type="radio" name="severity" value="definitive" checked={severity === 'definitive'} onChange={() => setSeverity('definitive')} />
                    Renvoi définitif
                  </label>
                </div>
                {severity === 'definitive' && (
                  <p style={{ fontSize: '0.75rem', color: '#8B0000', margin: '4px 0 0' }}>⚠️ Le compte sera définitivement désactivé.</p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
              {modal.type === 'transfer' ? (
                <button onClick={submitTransfer} style={{
                  background: 'linear-gradient(180deg, #c9a84c, #a88734)', color: '#1a1a1a',
                  border: '1px solid #8B7355', padding: '8px 20px', fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', borderRadius: 'var(--border-radius)'
                }}>
                  Confirmer le transfert
                </button>
              ) : (
                <button onClick={submitDismiss} style={{
                  background: 'linear-gradient(180deg, #a83232, #6b1010)', color: '#f5ecd7',
                  border: '1px solid #5a0000', padding: '8px 20px', fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', borderRadius: 'var(--border-radius)'
                }}>
                  Confirmer le renvoi
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 16px', fontSize: '0.85rem', cursor: 'pointer',
      background: active ? 'var(--military-dark)' : 'transparent',
      color: active ? '#f5ecd7' : 'var(--text-primary)',
      border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)',
      fontFamily: 'var(--font-mono)', transition: 'all 0.15s'
    }}>
      {children}
    </button>
  )
}

const th = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)', whiteSpace: 'nowrap' }
const td = { padding: 'var(--space-sm) var(--space-md)', verticalAlign: 'middle' }
