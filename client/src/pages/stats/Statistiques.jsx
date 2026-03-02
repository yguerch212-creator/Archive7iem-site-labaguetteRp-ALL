import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'

const COLORS = {
  prise: '#4B5320', perte: '#8B0000', attWinAll: '#556B2F', attWinUs: '#DAA520',
  defWinAll: '#2E5090', defWinUs: '#C19A6B', debut: '#708090', fin: '#2F4F4F'
}

function getRpWeekBounds(date) {
  const d = new Date(date)
  const day = d.getDay(), hour = d.getHours()
  let start = new Date(d)
  if (day === 5 && hour >= 20) start.setHours(20, 0, 0, 0)
  else { const db = day === 5 ? 7 : (day >= 5 ? day - 5 : day + 2); start.setDate(d.getDate() - db); start.setHours(20, 0, 0, 0) }
  const end = new Date(start); end.setDate(end.getDate() + 7)
  return { start, end }
}

function getWeekKey(date) {
  const { start } = getRpWeekBounds(date)
  return `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`
}

// Simple SVG bar chart
function BarChart({ data, height = 300, title }) {
  if (!data.length) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aucune donnée</p>
  const maxVal = Math.max(...data.map(d => d.total), 1)
  const barW = Math.min(60, Math.floor(700 / data.length) - 8)
  const chartW = data.length * (barW + 8) + 40
  const chartH = height - 40

  return (
    <div style={{ textAlign: 'center' }}>
      {title && <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>{title}</h3>}
      <div style={{ overflowX: 'auto' }}>
        <svg width={Math.max(chartW, 300)} height={height} viewBox={`0 0 ${Math.max(chartW, 300)} ${height}`} style={{ minWidth: 300 }}>
          {/* Y axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = chartH - pct * (chartH - 20)
            const v = Math.round(maxVal * pct)
            return <g key={i}>
              <line x1={35} y1={y} x2={chartW} y2={y} stroke="rgba(0,0,0,0.08)" />
              <text x={30} y={y + 4} textAnchor="end" fontSize="10" fill="#666">{v}</text>
            </g>
          })}
          {/* Stacked bars */}
          {data.map((d, i) => {
            const x = 40 + i * (barW + 8)
            let y = chartH
            const segments = [
              { key: 'prises', color: COLORS.prise, val: d.prises },
              { key: 'pertes', color: COLORS.perte, val: d.pertes },
              { key: 'attWinAll', color: COLORS.attWinAll, val: d.attWinAll },
              { key: 'attWinUs', color: COLORS.attWinUs, val: d.attWinUs },
              { key: 'defWinAll', color: COLORS.defWinAll, val: d.defWinAll },
              { key: 'defWinUs', color: COLORS.defWinUs, val: d.defWinUs },
            ]
            return <g key={i}>
              {segments.map((seg, j) => {
                if (!seg.val) return null
                const h = (seg.val / maxVal) * (chartH - 20)
                y -= h
                return <rect key={j} x={x} y={y} width={barW} height={h} fill={seg.color} rx={1} />
              })}
              <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize="9" fill="#666">{d.label}</text>
            </g>
          })}
        </svg>
      </div>
    </div>
  )
}

// Line chart for evolution over time
function LineChart({ data, height = 280, title }) {
  if (!data.length) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aucune donnée</p>
  const maxVal = Math.max(...data.map(d => Math.max(d.wins, d.losses)), 1)
  const chartW = Math.max(data.length * 50 + 60, 350)
  const chartH = height - 50
  const padL = 40, padT = 10

  const ptX = (i) => padL + (i / Math.max(data.length - 1, 1)) * (chartW - padL - 20)
  const ptY = (v) => padT + chartH - (v / maxVal) * chartH

  const winsPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${ptX(i)},${ptY(d.wins)}`).join(' ')
  const lossesPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${ptX(i)},${ptY(d.losses)}`).join(' ')
  const balancePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${ptX(i)},${ptY(Math.max(d.wins - d.losses, 0))}`).join(' ')

  return (
    <div style={{ textAlign: 'center' }}>
      {title && <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>{title}</h3>}
      <div style={{ overflowX: 'auto' }}>
        <svg width={chartW} height={height} viewBox={`0 0 ${chartW} ${height}`}>
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = ptY(maxVal * pct)
            return <g key={i}>
              <line x1={padL} y1={y} x2={chartW - 10} y2={y} stroke="rgba(0,0,0,0.06)" />
              <text x={padL - 5} y={y + 3} textAnchor="end" fontSize="9" fill="#666">{Math.round(maxVal * pct)}</text>
            </g>
          })}
          {/* Lines */}
          <path d={winsPath} fill="none" stroke={COLORS.prise} strokeWidth="2.5" />
          <path d={lossesPath} fill="none" stroke={COLORS.perte} strokeWidth="2.5" />
          <path d={balancePath} fill="none" stroke={COLORS.defWinAll} strokeWidth="1.5" strokeDasharray="5,3" />
          {/* Points */}
          {data.map((d, i) => <g key={i}>
            <circle cx={ptX(i)} cy={ptY(d.wins)} r={3.5} fill={COLORS.prise} />
            <circle cx={ptX(i)} cy={ptY(d.losses)} r={3.5} fill={COLORS.perte} />
            <text x={ptX(i)} y={chartH + padT + 16} textAnchor="middle" fontSize="8" fill="#666">{d.label}</text>
          </g>)}
          {/* X axis */}
          <line x1={padL} y1={chartH + padT} x2={chartW - 10} y2={chartH + padT} stroke="#999" />
        </svg>
      </div>
    </div>
  )
}

// Pie chart (same as Commandement)
function PieChart({ data, size = 220, title }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aucune donnée</p>
  const COLS = [COLORS.prise, COLORS.perte, COLORS.attWinAll, COLORS.attWinUs, COLORS.defWinAll, COLORS.defWinUs, '#DAA520', '#708090']
  let angle = 0
  const slices = data.map((d, i) => {
    const pct = d.value / total
    const sa = angle; angle += pct * 360; const ea = angle
    const r = size / 2 - 10, cx = size / 2, cy = size / 2
    const x1 = cx + r * Math.cos((sa - 90) * Math.PI / 180), y1 = cy + r * Math.sin((sa - 90) * Math.PI / 180)
    const x2 = cx + r * Math.cos((ea - 90) * Math.PI / 180), y2 = cy + r * Math.sin((ea - 90) * Math.PI / 180)
    const ma = (sa + ea) / 2
    const lx = cx + (r * 0.65) * Math.cos((ma - 90) * Math.PI / 180), ly = cy + (r * 0.65) * Math.sin((ma - 90) * Math.PI / 180)
    return { ...d, pct, x1, y1, x2, y2, lx, ly, r, cx, cy, color: d.color || COLS[i % COLS.length], largeArc: pct > 0.5 ? 1 : 0 }
  })
  return (
    <div style={{ textAlign: 'center' }}>
      {title && <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>{title}</h4>}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => s.pct >= 0.999
          ? <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.color} />
          : <path key={i} d={`M${s.cx},${s.cy} L${s.x1},${s.y1} A${s.r},${s.r} 0 ${s.largeArc},1 ${s.x2},${s.y2} Z`} fill={s.color} stroke="#f5f0e1" strokeWidth="1.5" />
        )}
        {slices.filter(s => s.pct >= 0.06).map((s, i) => (
          <text key={i} x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="10" fontWeight="700" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>{s.value}</text>
        ))}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 14px', marginTop: 8 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem' }}>
            <span style={{ width: 11, height: 11, borderRadius: 2, background: s.color, display: 'inline-block', flexShrink: 0 }} />
            <span><strong>{s.label}</strong> — {s.value} ({Math.round(s.pct * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Statistiques({ embedded = false }) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/front/events').then(r => { setEvents(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  // Only combat events
  const combatEvents = useMemo(() => events.filter(e => ['prise', 'perte', 'attaque', 'defense'].includes(e.type_event)), [events])

  // === PIE: Global breakdown ===
  const globalPie = useMemo(() => {
    const counts = { prise: 0, perte: 0, attWinAll: 0, attWinUs: 0, defWinAll: 0, defWinUs: 0 }
    combatEvents.forEach(e => {
      if (e.type_event === 'prise') counts.prise++
      else if (e.type_event === 'perte') counts.perte++
      else if (e.type_event === 'attaque') { if (e.camp_vainqueur === 'allemand') counts.attWinAll++; else counts.attWinUs++ }
      else if (e.type_event === 'defense') { if (e.camp_vainqueur === 'allemand') counts.defWinAll++; else counts.defWinUs++ }
    })
    return [
      { label: '🚩 Prises VP', value: counts.prise, color: COLORS.prise },
      { label: '🏳️ Pertes VP', value: counts.perte, color: COLORS.perte },
      { label: '⚔️ Att. Win ALL', value: counts.attWinAll, color: COLORS.attWinAll },
      { label: '⚔️ Att. Win US', value: counts.attWinUs, color: COLORS.attWinUs },
      { label: '🛡️ Déf. Win ALL', value: counts.defWinAll, color: COLORS.defWinAll },
      { label: '🛡️ Déf. Win US', value: counts.defWinUs, color: COLORS.defWinUs },
    ].filter(d => d.value > 0)
  }, [combatEvents])

  // === WEEKLY DATA for bar + line charts ===
  const weeklyData = useMemo(() => {
    const weekMap = {}
    combatEvents.forEach(e => {
      const d = new Date(e.date_irl || e.created_at)
      const key = getWeekKey(d)
      if (!weekMap[key]) weekMap[key] = { label: key, prises: 0, pertes: 0, attWinAll: 0, attWinUs: 0, defWinAll: 0, defWinUs: 0, total: 0, wins: 0, losses: 0, date: d }
      const w = weekMap[key]
      w.total++
      if (e.type_event === 'prise') { w.prises++; w.wins++ }
      else if (e.type_event === 'perte') { w.pertes++; w.losses++ }
      else if (e.type_event === 'attaque') {
        if (e.camp_vainqueur === 'allemand') { w.attWinAll++; w.wins++ } else { w.attWinUs++; w.losses++ }
      } else if (e.type_event === 'defense') {
        if (e.camp_vainqueur === 'allemand') { w.defWinAll++; w.wins++ } else { w.defWinUs++; w.losses++ }
      }
    })
    return Object.values(weekMap).sort((a, b) => a.date - b.date)
  }, [combatEvents])

  // === PER-MAP breakdown ===
  const mapData = useMemo(() => {
    const maps = {}
    combatEvents.forEach(e => {
      const m = e.carte_nom || 'Inconnue'
      if (!maps[m]) maps[m] = { prises: 0, pertes: 0, attWinAll: 0, attWinUs: 0, defWinAll: 0, defWinUs: 0, total: 0, wins: 0, losses: 0 }
      const w = maps[m]; w.total++
      if (e.type_event === 'prise') { w.prises++; w.wins++ }
      else if (e.type_event === 'perte') { w.pertes++; w.losses++ }
      else if (e.type_event === 'attaque') { if (e.camp_vainqueur === 'allemand') { w.attWinAll++; w.wins++ } else { w.attWinUs++; w.losses++ } }
      else if (e.type_event === 'defense') { if (e.camp_vainqueur === 'allemand') { w.defWinAll++; w.wins++ } else { w.defWinUs++; w.losses++ } }
    })
    return Object.entries(maps).sort((a, b) => b[1].total - a[1].total)
  }, [combatEvents])

  // === Summary stats ===
  const summary = useMemo(() => {
    const totalWins = combatEvents.filter(e =>
      e.type_event === 'prise' ||
      (e.type_event === 'attaque' && e.camp_vainqueur === 'allemand') ||
      (e.type_event === 'defense' && e.camp_vainqueur === 'allemand')
    ).length
    const totalLosses = combatEvents.filter(e =>
      e.type_event === 'perte' ||
      (e.type_event === 'attaque' && e.camp_vainqueur !== 'allemand') ||
      (e.type_event === 'defense' && e.camp_vainqueur !== 'allemand')
    ).length
    const ratio = totalLosses > 0 ? (totalWins / totalLosses).toFixed(2) : totalWins > 0 ? '∞' : '—'
    return { totalWins, totalLosses, total: combatEvents.length, ratio }
  }, [combatEvents])

  if (loading) return embedded ? null : <div className="container"><p style={{ textAlign: 'center', padding: 40 }}>Chargement...</p></div>

  const Wrapper = embedded ? 'div' : 'div'

  return (
    <div className={embedded ? '' : 'container'} style={{ paddingBottom: embedded ? 0 : 'var(--space-xxl)' }}>
      {!embedded && <BackButton label="← Retour" />}
      <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)', fontSize: embedded ? '1.1rem' : '1.5rem' }}>📊 Statistiques — Situation du Front</h2>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {[
          { icon: '⚔️', label: 'Total événements', value: summary.total, color: '#2F4F4F' },
          { icon: '✅', label: 'Victoires', value: summary.totalWins, color: '#4B5320' },
          { icon: '❌', label: 'Défaites', value: summary.totalLosses, color: '#8B0000' },
          { icon: '⚖️', label: 'Ratio V/D', value: summary.ratio, color: '#2E5090' },
        ].map((s, i) => (
          <div key={i} className="paper-card" style={{ textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pie + Line side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(300px, 2fr)', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <div className="paper-card" style={{ padding: 'var(--space-lg)' }}>
          <PieChart data={globalPie} size={240} title="📊 Répartition globale" />
        </div>
        <div className="paper-card" style={{ padding: 'var(--space-lg)' }}>
          <LineChart data={weeklyData} height={280} title="📈 Évolution hebdomadaire (Victoires vs Défaites)" />
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 3, background: COLORS.prise, display: 'inline-block' }} /> Victoires</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 3, background: COLORS.perte, display: 'inline-block' }} /> Défaites</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 3, background: COLORS.defWinAll, display: 'inline-block', borderTop: '1px dashed' }} /> Balance</span>
          </div>
        </div>
      </div>

      {/* Bar chart - weekly stacked */}
      <div className="paper-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <BarChart data={weeklyData} height={300} title="📊 Détail hebdomadaire (empilé)" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center', marginTop: 12, fontSize: '0.72rem' }}>
          {[
            { label: 'Prises VP', color: COLORS.prise },
            { label: 'Pertes VP', color: COLORS.perte },
            { label: 'Att. Win ALL', color: COLORS.attWinAll },
            { label: 'Att. Win US', color: COLORS.attWinUs },
            { label: 'Déf. Win ALL', color: COLORS.defWinAll },
            { label: 'Déf. Win US', color: COLORS.defWinUs },
          ].map((l, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 11, height: 11, borderRadius: 2, background: l.color, display: 'inline-block' }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Per-map table */}
      <div className="paper-card" style={{ padding: 'var(--space-lg)' }}>
        <h3 style={{ margin: '0 0 12px', textAlign: 'center' }}>🗺️ Statistiques par carte</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Carte</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>Prises</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>Pertes</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>Att. ✅</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>Att. ❌</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>Déf. ✅</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>Déf. ❌</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>Total</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>Ratio</th>
              </tr>
            </thead>
            <tbody>
              {mapData.map(([name, d], i) => {
                const ratio = d.losses > 0 ? (d.wins / d.losses).toFixed(1) : d.wins > 0 ? '∞' : '—'
                const ratioColor = d.wins > d.losses ? '#4B5320' : d.wins < d.losses ? '#8B0000' : '#666'
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{name}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.prise, fontWeight: 600 }}>{d.prises || '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.perte, fontWeight: 600 }}>{d.pertes || '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>{d.attWinAll || '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>{d.attWinUs || '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>{d.defWinAll || '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>{d.defWinUs || '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>{d.total}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: ratioColor }}>{ratio}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
