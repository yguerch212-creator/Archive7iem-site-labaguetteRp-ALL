import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import { exportToPdf } from '../../utils/exportPdf'

export default function Gazette() {
  const { user } = useAuth()
  const [gazettes, setGazettes] = useState([])
  const [selected, setSelected] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [msg, setMsg] = useState('')

  const canCreate = user?.isAdmin || user?.isOfficier

  useEffect(() => { load() }, [])
  const load = () => api.get('/gazette').then(r => setGazettes(r.data.data)).catch(() => {})

  const loadGazette = (id) => api.get(`/gazette/${id}`).then(r => setSelected(r.data.data)).catch(() => {})

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await api.get('/gazette/generate/preview')
      setPreviewData(res.data)
    } catch (err) { setMsg('Erreur génération') }
    setGenerating(false)
  }

  const publish = async () => {
    if (!previewData) return
    try {
      await api.post('/gazette', { numero: previewData.numero, semaine: previewData.semaine, titre: `Gazette N°${previewData.numero}`, contenu: previewData.contenu, published: true })
      setPreviewData(null); setMsg('✅ Gazette publiée !'); setTimeout(() => setMsg(''), 3000); load()
    } catch (err) { setMsg('Erreur') }
  }

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <BackButton label="← Tableau de bord" />
        {canCreate && !previewData && <button className="btn btn-primary btn-small" onClick={generate} disabled={generating}>{generating ? '⏳...' : '📰 Générer gazette'}</button>}
      </div>
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>📰 Gazette du 7. Armeekorps</h1>
      {msg && <div className="alert alert-success">{msg}</div>}

      {/* Preview */}
      {previewData && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div id="gazette-doc" style={{ background: '#f5f2e8', border: '1px solid #c4b99a', borderRadius: 4, padding: '50px 60px', maxWidth: 820, margin: '0 auto', fontFamily: "'IBM Plex Mono', monospace" }}>
            <div style={{ textAlign: 'center', borderBottom: '3px double #3d5a3e', paddingBottom: 20, marginBottom: 30 }}>
              <div style={{ fontSize: '0.7rem', letterSpacing: 5, color: '#666' }}>PUBLICATION HEBDOMADAIRE</div>
              <h1 style={{ margin: '8px 0', fontSize: '1.8rem', color: '#3d5a3e' }}>GAZETTE DU 7. ARMEEKORPS</h1>
              <div style={{ fontSize: '0.85rem', color: '#555' }}>N°{previewData.numero} — {previewData.semaine}</div>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: 1.7, fontFamily: 'inherit' }}>{previewData.contenu}</pre>
          </div>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={publish}>📰 Publier</button>
            <button className="btn btn-secondary" onClick={() => setPreviewData(null)}>✕ Annuler</button>
            <button className="btn btn-secondary" onClick={() => exportToPdf('gazette-doc', `Gazette_${previewData.numero}`)}>📥 PDF</button>
          </div>
          <div className="form-group" style={{ maxWidth: 820, margin: '12px auto 0' }}>
            <label className="form-label">Modifier le contenu avant publication :</label>
            <textarea className="form-input" value={previewData.contenu} onChange={e => setPreviewData(p => ({ ...p, contenu: e.target.value }))} rows={15} style={{ resize: 'vertical' }} />
          </div>
        </div>
      )}

      {/* Selected gazette view */}
      {selected && !previewData && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div id="gazette-view" style={{ background: '#f5f2e8', border: '1px solid #c4b99a', borderRadius: 4, padding: '50px 60px', maxWidth: 820, margin: '0 auto', fontFamily: "'IBM Plex Mono', monospace" }}>
            <div style={{ textAlign: 'center', borderBottom: '3px double #3d5a3e', paddingBottom: 20, marginBottom: 30 }}>
              <div style={{ fontSize: '0.7rem', letterSpacing: 5, color: '#666' }}>PUBLICATION HEBDOMADAIRE</div>
              <h1 style={{ margin: '8px 0', fontSize: '1.8rem', color: '#3d5a3e' }}>GAZETTE DU 7. ARMEEKORPS</h1>
              <div style={{ fontSize: '0.85rem', color: '#555' }}>N°{selected.numero} — {selected.semaine || ''}</div>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: 1.7, fontFamily: 'inherit' }}>{selected.contenu}</pre>
          </div>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setSelected(null)}>← Retour</button>
            <button className="btn btn-secondary" onClick={() => exportToPdf('gazette-view', `Gazette_${selected.numero}`)}>📥 PDF</button>
          </div>
        </div>
      )}

      {/* List */}
      {!selected && !previewData && (
        <div className="paper-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table" style={{ margin: 0 }}>
            <thead><tr><th>N°</th><th>Titre</th><th>Semaine</th><th>Date</th></tr></thead>
            <tbody>
              {gazettes.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>Aucune gazette publiée</td></tr>
              ) : gazettes.map(g => (
                <tr key={g.id} style={{ cursor: 'pointer' }} onClick={() => loadGazette(g.id)}>
                  <td><strong>N°{g.numero}</strong></td>
                  <td>{g.titre}</td>
                  <td>{g.semaine || '—'}</td>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(g.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
