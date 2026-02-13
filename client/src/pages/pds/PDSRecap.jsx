import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/client'

const JOURS = ['vendredi', 'samedi', 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi_fin']
const JOURS_SHORT = ['Ven.', 'Sam.', 'Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.']

export default function PDSRecap() {
  const [params] = useSearchParams()
  const semaine = params.get('semaine') || ''
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/pds/recap', { params: { semaine } }).then(r => { setData(r.data.data); setLoading(false) }).catch(() => setLoading(false))
  }, [semaine])

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>
  if (!data) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Erreur</div>

  // Group by unite
  const grouped = {}
  data.rows.forEach(r => {
    const key = r.unite_code || 'Sans unité'
    if (!grouped[key]) grouped[key] = { nom: r.unite_nom, effectifs: [] }
    grouped[key].effectifs.push(r)
  })

  return (
    <div className="container" style={{ maxWidth: 1100, paddingBottom: 'var(--space-xxl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }} className="no-print">
        <BackButton label="← Retour PDS" />
        <button className="btn btn-primary btn-small" onClick={() => window.print()}>🖨️ Imprimer</button>
      </div>

      <div className="document-paper" id="pds-recap">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', borderBottom: '2px solid var(--border-color)', paddingBottom: 'var(--space-lg)' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.3rem' }}>📋 RÉCAPITULATIF PDS</h2>
          <div style={{ fontSize: '0.9rem' }}>{data.semaine}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>7e Armeekorps — Prise De Service</div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 'var(--space-lg)', justifyContent: 'center', marginBottom: 'var(--space-xl)', fontSize: '0.9rem' }}>
          <div style={{ textAlign: 'center' }}><strong style={{ fontSize: '1.5rem' }}>{data.stats.total}</strong><br/>Effectifs</div>
          <div style={{ textAlign: 'center' }}><strong style={{ fontSize: '1.5rem', color: 'var(--military-green)' }}>{data.stats.remplis}</strong><br/>Remplis</div>
          <div style={{ textAlign: 'center' }}><strong style={{ fontSize: '1.5rem', color: 'var(--success)' }}>{data.stats.valides}</strong><br/>Validés (≥6h)</div>
          <div style={{ textAlign: 'center' }}><strong style={{ fontSize: '1.5rem', color: 'var(--danger)' }}>{data.stats.nonRemplis}</strong><br/>Non remplis</div>
        </div>

        {/* Per unit tables */}
        {Object.entries(grouped).map(([code, { nom, effectifs }]) => {
          const filled = effectifs.filter(e => e.pds_id)
          const valid = effectifs.filter(e => e.valide)
          return (
            <div key={code} style={{ marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: '0.95rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
                {code}. {nom} — {valid.length}/{effectifs.length} validés
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={th}>Effectif</th>
                    <th style={th}>Grade</th>
                    {JOURS_SHORT.map((j, i) => <th key={i} style={{ ...th, textAlign: 'center', minWidth: 40 }}>{j}</th>)}
                    <th style={{ ...th, textAlign: 'right' }}>Total</th>
                    <th style={{ ...th, textAlign: 'center' }}>✓</th>
                  </tr>
                </thead>
                <tbody>
                  {effectifs.map(e => (
                    <tr key={e.effectif_id} style={{ borderBottom: '1px solid var(--border-color)', background: !e.pds_id ? 'rgba(139,74,71,0.04)' : e.valide ? '' : 'rgba(161,124,71,0.04)' }}>
                      <td style={td}>{e.prenom} {e.nom}</td>
                      <td style={{ ...td, fontSize: '0.7rem' }}>{e.grade_nom || '—'}</td>
                      {JOURS.map((j, i) => <td key={i} style={{ ...td, textAlign: 'center', fontSize: '0.7rem', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e[j] || '—'}</td>)}
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{e.pds_id ? `${Math.round((e.total_heures || 0) * 10) / 10}h` : '—'}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{e.valide ? '✅' : e.pds_id ? '❌' : '⬜'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}

        {/* Permissions */}
        {data.perms.length > 0 && (
          <div style={{ marginTop: 'var(--space-xl)' }}>
            <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: '0.95rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>🏖️ Permissions approuvées</h3>
            {data.perms.map(p => (
              <div key={p.id} style={{ fontSize: '0.8rem', padding: '2px 0' }}>
                • {p.grade_nom ? `${p.grade_nom} ` : ''}{p.prenom} {p.eff_nom} — du {p.date_debut} au {p.date_fin} : {p.raison}
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)', paddingTop: 'var(--space-md)', borderTop: '2px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Document généré automatiquement — Archives 7e Armeekorps
        </div>
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: '4px 8px', fontWeight: 700, color: 'var(--military-dark)', whiteSpace: 'nowrap', fontSize: '0.75rem' }
const td = { padding: '4px 8px' }
