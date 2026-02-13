import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import './pds.css'

const JOURS = ['vendredi', 'samedi', 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi_fin']
const JOURS_SHORT = { vendredi: 'Ven.→', samedi: 'Sam.', dimanche: 'Dim.', lundi: 'Lun.', mardi: 'Mar.', mercredi: 'Mer.', jeudi: 'Jeu.', vendredi_fin: '→Ven.' }

function formatHeures(h) {
  if (!h || h === 0) return '0h00'
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return `${hrs}h${String(mins).padStart(2, '0')}`
}

function weekLabel(w) {
  try {
    const [y, wn] = w.split('-W').map(Number)
    const jan4 = new Date(Date.UTC(y, 0, 4))
    const dayOfWeek = jan4.getUTCDay() || 7
    const monday = new Date(jan4)
    monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (wn - 1) * 7)
    const friday = new Date(monday)
    friday.setUTCDate(monday.getUTCDate() + 4)
    const nextFriday = new Date(friday)
    nextFriday.setUTCDate(friday.getUTCDate() + 7)
    const fmt = d => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${fmt(friday)} — ${fmt(nextFriday)}`
  } catch { return w }
}

export default function PDSRecap() {
  const [searchParams] = useSearchParams()
  const semaine = searchParams.get('semaine') || ''
  const [data, setData] = useState([])
  const [stats, setStats] = useState({})
  const [filterUnite, setFilterUnite] = useState('')

  useEffect(() => {
    if (semaine) {
      api.get('/pds', { params: { semaine } }).then(r => {
        setData(r.data.data)
        setStats(r.data.stats)
      }).catch(() => {})
    }
  }, [semaine])

  const unites = [...new Set(data.map(d => d.unite_code))].sort()
  const filtered = filterUnite ? data.filter(d => d.unite_code === filterUnite) : data
  const grouped = {}
  filtered.forEach(d => {
    if (!grouped[d.unite_code]) grouped[d.unite_code] = { nom: d.unite_nom, effectifs: [] }
    grouped[d.unite_code].effectifs.push(d)
  })

  return (
    <div className="container pds-recap-page">
      <div className="no-print" style={{ marginBottom: '1.5rem' }}>
        <BackButton />
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filterUnite} onChange={e => setFilterUnite(e.target.value)} className="input-field" style={{ width: 'auto', minWidth: 180 }}>
            <option value="">Toutes les unités</option>
            {unites.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Imprimer / PDF</button>
        </div>
      </div>

      <div className="recap-document">
        <div className="recap-header">
          <h1>RÉCAPITULATIF — PRISE DE SERVICE</h1>
          <h2>{weekLabel(semaine)}</h2>
          <div className="recap-stats-line">
            <span>{stats.saisis || 0} effectifs — {stats.valides || 0} validés (≥6h) — {(stats.saisis || 0) - (stats.valides || 0)} insuffisants</span>
          </div>
        </div>

        {Object.entries(grouped).map(([code, { nom, effectifs }]) => (
          <div key={code} className="recap-unite">
            <h3>{code} — {nom} ({effectifs.filter(e => e.valide).length}/{effectifs.length} validés)</h3>
            <table className="recap-table">
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Nom</th>
                  {JOURS.map(j => <th key={j}>{JOURS_SHORT[j]}</th>)}
                  <th>Total</th>
                  <th>✓</th>
                </tr>
              </thead>
              <tbody>
                {effectifs.map(eff => (
                  <tr key={eff.effectif_id} className={eff.valide ? '' : 'row-ko'}>
                    <td className="td-grade">{eff.grade_nom || '—'}</td>
                    <td className="td-name">{eff.prenom} {eff.nom}</td>
                    {JOURS.map(j => <td key={j} className="td-slot">{eff[j] || '—'}</td>)}
                    <td className="td-total"><strong>{formatHeures(eff.total_heures)}</strong></td>
                    <td>{eff.valide ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div className="recap-footer">
          <p>Document généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          <p>Archives du 7e Armeekorps — Axe | LaBaguetteRP</p>
        </div>
      </div>
    </div>
  )
}
