import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import { exportToImage } from '../../utils/exportPdf'

function ExportableBlock({ id, title, children }) {
  return (
    <div id={id} style={{ position: 'relative' }}>
      <button
        className="btn btn-secondary btn-small"
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 5, fontSize: '0.65rem', padding: '2px 6px', opacity: 0.6 }}
        onClick={() => exportToImage(id, title || id)}
        title="Télécharger en image"
      >
        🖼️
      </button>
      {children}
    </div>
  )
}

const COLORS = {
  allGreen: '#4B5320', usRed: '#8B0000', attAll: '#556B2F', attUs: '#DAA520',
  defAll: '#2E5090', defUs: '#C19A6B', prise: '#3d6b3d', perte: '#8b4a47',
  neutral: '#708090'
}

// ==============================
// RP WEEK HELPERS
// ==============================
function getRpWeekBounds(date) {
  const d = new Date(date)
  const day = d.getDay(), hour = d.getHours()
  let start = new Date(d)
  if (day === 5 && hour >= 20) start.setHours(20, 0, 0, 0)
  else { const db = day === 5 ? 7 : (day >= 5 ? day - 5 : day + 2); start.setDate(d.getDate() - db); start.setHours(20, 0, 0, 0) }
  const end = new Date(start); end.setDate(end.getDate() + 7)
  return { start, end }
}

function getWeekLabel(date) {
  const { start, end } = getRpWeekBounds(date)
  const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
  return `${fmt(start)}-${fmt(end)}`
}

function getWeekKey(date) {
  const { start } = getRpWeekBounds(date)
  return start.toISOString().slice(0,10)
}

function fmtDate(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function fmtDateShort(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
}

function toYMD(d) { return d.toISOString().slice(0,10) }

// Format PDS hours properly (Fix 1) — Xh XXmin format
function formatPdsHours(val) {
  if (val === null || val === undefined || val === '' || isNaN(val)) return null
  const num = parseFloat(val)
  if (isNaN(num) || num === 0) return null
  const hours = Math.floor(num)
  const minutes = Math.round((num - hours) * 60)
  return `${hours}h ${String(minutes).padStart(2, '0')}min`
}

function rawPdsHours(val) {
  if (val === null || val === undefined || val === '' || isNaN(val)) return 0
  const num = parseFloat(val)
  return isNaN(num) ? 0 : num
}

// Day label helpers (Fix 3)
const JOUR_NOMS_COURT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
function getDayLabel(date) {
  const d = new Date(date)
  const jour = JOUR_NOMS_COURT[d.getDay()]
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${jour} ${dd}/${mm}`
}

function getDayKey(date) {
  const d = new Date(date)
  return d.toISOString().slice(0, 10)
}

// ==============================
// SVG PIE
// ==============================
function PieChart({ data, size = 220, title }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aucune donnee</p>
  let angle = 0
  const slices = data.map((d, i) => {
    const pct = d.value / total; const sa = angle; angle += pct * 360; const ea = angle
    const r = size / 2 - 10, cx = size / 2, cy = size / 2
    const x1 = cx + r * Math.cos((sa - 90) * Math.PI / 180), y1 = cy + r * Math.sin((sa - 90) * Math.PI / 180)
    const x2 = cx + r * Math.cos((ea - 90) * Math.PI / 180), y2 = cy + r * Math.sin((ea - 90) * Math.PI / 180)
    const ma = (sa + ea) / 2
    const lx = cx + (r * 0.65) * Math.cos((ma - 90) * Math.PI / 180), ly = cy + (r * 0.65) * Math.sin((ma - 90) * Math.PI / 180)
    return { ...d, pct, x1, y1, x2, y2, lx, ly, r, cx, cy, largeArc: pct > 0.5 ? 1 : 0 }
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
          <text key={i} x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="11" fontWeight="700" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>{s.value}</text>
        ))}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 12px', marginTop: 8 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: 'inline-block', flexShrink: 0 }} />
            <span><strong>{s.label}</strong> {s.value} ({Math.round(s.pct * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==============================
// SVG BAR CHART
// ==============================
function BarChart({ data, height = 300, title, legend }) {
  if (!data.length) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aucune donnee</p>
  const maxVal = Math.max(...data.map(d => d.total), 1)
  const barW = Math.min(50, Math.floor(700 / data.length) - 8)
  const chartW = data.length * (barW + 8) + 50
  const chartH = height - 40
  return (
    <div style={{ textAlign: 'center' }}>
      {title && <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>{title}</h4>}
      <div style={{ overflowX: 'auto' }}>
        <svg width={Math.max(chartW, 300)} height={height} viewBox={`0 0 ${Math.max(chartW, 300)} ${height}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = chartH - pct * (chartH - 20)
            return <g key={i}><line x1={35} y1={y} x2={chartW} y2={y} stroke="rgba(0,0,0,0.08)" /><text x={30} y={y + 4} textAnchor="end" fontSize="10" fill="#666">{Math.round(maxVal * pct)}</text></g>
          })}
          {data.map((d, i) => {
            const x = 45 + i * (barW + 8)
            let y = chartH
            return <g key={i}>
              {(d.segments || []).map((seg, j) => {
                if (!seg.val) return null
                const h = (seg.val / maxVal) * (chartH - 20); y -= h
                return <rect key={j} x={x} y={y} width={barW} height={h} fill={seg.color} rx={1} />
              })}
              <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize="9" fill="#666" transform={data.length > 10 ? `rotate(-30, ${x + barW/2}, ${chartH + 14})` : ''}>{d.label}</text>
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="9" fill="#333" fontWeight="600">{d.total}</text>
            </g>
          })}
        </svg>
      </div>
      {legend && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'center', marginTop: 8, fontSize: '0.72rem' }}>
        {legend.map((l, i) => <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: 'inline-block' }} />{l.label}</span>)}
      </div>}
    </div>
  )
}

// ==============================
// SVG LINE CHART (Fix 2 — larger)
// ==============================
function LineChart({ series, labels, height = 350, title, legend }) {
  if (!labels.length) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aucune donnee</p>
  const allVals = series.flatMap(s => s.data)
  const maxVal = Math.max(...allVals, 1)
  const chartW = Math.max(labels.length * 65 + 80, 500)
  const chartH = height - 60
  const padL = 50, padT = 15
  const ptX = (i) => padL + (i / Math.max(labels.length - 1, 1)) * (chartW - padL - 30)
  const ptY = (v) => padT + chartH - (v / maxVal) * chartH

  // Better Y-axis steps
  const ySteps = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div style={{ textAlign: 'center', width: '100%' }}>
      {title && <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700 }}>{title}</h4>}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <svg width={chartW} height={height} viewBox={`0 0 ${chartW} ${height}`} style={{ width: '100%', minWidth: chartW }}>
          {ySteps.map((pct, i) => {
            const y = ptY(maxVal * pct)
            const val = Math.round(maxVal * pct)
            return <g key={i}>
              <line x1={padL} y1={y} x2={chartW - 10} y2={y} stroke="rgba(0,0,0,0.08)" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#555" fontWeight="500" fontFamily="'IBM Plex Mono', monospace">{val}</text>
            </g>
          })}
          {series.map((s, si) => {
            const path = s.data.map((v, i) => `${i === 0 ? 'M' : 'L'}${ptX(i)},${ptY(v)}`).join(' ')
            return <g key={si}>
              <path d={path} fill="none" stroke={s.color} strokeWidth={s.dashed ? 1.5 : 2.5} strokeDasharray={s.dashed ? '5,3' : 'none'} />
              {s.data.map((v, i) => <circle key={i} cx={ptX(i)} cy={ptY(v)} r={4} fill={s.color} stroke="#fff" strokeWidth={1.5} />)}
            </g>
          })}
          {labels.map((l, i) => <text key={i} x={ptX(i)} y={chartH + padT + 22} textAnchor="middle" fontSize="10" fill="#555" fontFamily="'IBM Plex Mono', monospace">{l}</text>)}
          <line x1={padL} y1={chartH + padT} x2={chartW - 10} y2={chartH + padT} stroke="#999" />
          <line x1={padL} y1={padT} x2={padL} y2={chartH + padT} stroke="#ddd" />
        </svg>
      </div>
      {legend && <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10, fontSize: '0.8rem' }}>
        {legend.map((l, i) => <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 18, height: 3, background: l.color, display: 'inline-block', borderRadius: 2, borderTop: l.dashed ? '1px dashed' : 'none' }} />
          <span style={{ fontWeight: 600 }}>{l.label}</span>
        </span>)}
      </div>}
    </div>
  )
}

// ==============================
// SVG COMPOSITE CHART (Fix 2 — VP bars + battle line)
// ==============================
function CompositeChart({ data, height = 380, title }) {
  if (!data.length) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aucune donnee</p>
  const maxBar = Math.max(...data.map(d => Math.max(d.prises, d.pertes)), 1)
  const maxLine = Math.max(...data.map(d => Math.max(d.winAll, d.winUs)), 1)
  const barW = Math.min(40, Math.floor(700 / data.length) - 12)
  const chartW = Math.max(data.length * (barW * 2 + 16) + 80, 400)
  const chartH = height - 60
  const padL = 50, padR = 50, padT = 20

  const barY = (v) => padT + chartH - (v / maxBar) * chartH
  const lineY = (v) => padT + chartH - (v / maxLine) * chartH
  const xPos = (i) => padL + i * (barW * 2 + 16) + barW

  return (
    <div style={{ textAlign: 'center', width: '100%' }}>
      {title && <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700 }}>{title}</h4>}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <svg width={chartW} height={height} viewBox={`0 0 ${chartW} ${height}`} style={{ width: '100%', minWidth: chartW }}>
          {/* Y-axis left (VP) */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = barY(maxBar * pct)
            return <g key={`yl${i}`}>
              <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="rgba(0,0,0,0.06)" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#555">{Math.round(maxBar * pct)}</text>
            </g>
          })}
          {/* Y-axis right (Batailles) */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = lineY(maxLine * pct)
            return <text key={`yr${i}`} x={chartW - padR + 8} y={y + 4} textAnchor="start" fontSize="10" fill="#2E5090">{Math.round(maxLine * pct)}</text>
          })}
          {/* Axis labels */}
          <text x={10} y={padT - 6} fontSize="9" fill="#555" fontWeight="600">VP</text>
          <text x={chartW - 20} y={padT - 6} fontSize="9" fill="#2E5090" fontWeight="600">Bat.</text>

          {/* Bars */}
          {data.map((d, i) => {
            const x = xPos(i)
            const prisesH = (d.prises / maxBar) * chartH
            const pertesH = (d.pertes / maxBar) * chartH
            return <g key={`bar${i}`}>
              <rect x={x - barW} y={padT + chartH - prisesH} width={barW - 1} height={prisesH} fill={COLORS.prise} rx={2} opacity={0.85} />
              <rect x={x + 1} y={padT + chartH - pertesH} width={barW - 1} height={pertesH} fill={COLORS.perte} rx={2} opacity={0.85} />
              {d.prises > 0 && <text x={x - barW/2} y={padT + chartH - prisesH - 4} textAnchor="middle" fontSize="9" fill={COLORS.prise} fontWeight="600">{d.prises}</text>}
              {d.pertes > 0 && <text x={x + barW/2} y={padT + chartH - pertesH - 4} textAnchor="middle" fontSize="9" fill={COLORS.perte} fontWeight="600">{d.pertes}</text>}
              <text x={x} y={chartH + padT + 16} textAnchor="middle" fontSize="9" fill="#666">{d.label}</text>
            </g>
          })}

          {/* Battle lines */}
          {data.length > 1 && <>
            <path d={data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(i)},${lineY(d.winAll)}`).join(' ')} fill="none" stroke={COLORS.allGreen} strokeWidth={2.5} />
            <path d={data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(i)},${lineY(d.winUs)}`).join(' ')} fill="none" stroke={COLORS.usRed} strokeWidth={2.5} />
          </>}
          {data.map((d, i) => <g key={`dots${i}`}>
            {d.winAll > 0 && <circle cx={xPos(i)} cy={lineY(d.winAll)} r={5} fill={COLORS.allGreen} stroke="#fff" strokeWidth={2} />}
            {d.winUs > 0 && <circle cx={xPos(i)} cy={lineY(d.winUs)} r={5} fill={COLORS.usRed} stroke="#fff" strokeWidth={2} />}
          </g>)}

          {/* Axes */}
          <line x1={padL} y1={chartH + padT} x2={chartW - padR} y2={chartH + padT} stroke="#999" />
          <line x1={padL} y1={padT} x2={padL} y2={chartH + padT} stroke="#999" />
          <line x1={chartW - padR} y1={padT} x2={chartW - padR} y2={chartH + padT} stroke="#ccc" strokeDasharray="4,2" />
        </svg>
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10, fontSize: '0.78rem', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 14, background: COLORS.prise, borderRadius: 2, display: 'inline-block' }} /> Prises VP (hors synchro)</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 14, background: COLORS.perte, borderRadius: 2, display: 'inline-block' }} /> Pertes VP</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 3, background: COLORS.allGreen, borderRadius: 2, display: 'inline-block' }} /> \u25CF Victoires ALL</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 3, background: COLORS.usRed, borderRadius: 2, display: 'inline-block' }} /> \u25CF Victoires US</span>
      </div>
    </div>
  )
}

// ==============================
// CSS BAR (horizontal)
// ==============================
function HBar({ label, value, max, color, suffix = '' }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ width: 120, fontSize: '0.8rem', fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 20, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s', minWidth: value > 0 ? 4 : 0 }} />
      </div>
      <span style={{ width: 50, fontSize: '0.8rem', fontWeight: 700, color, flexShrink: 0 }}>{value}{suffix}</span>
    </div>
  )
}

// ==============================
// PERIOD FILTER BAR
// ==============================
const FILTER_MODES = [
  { key: 'tout', label: 'Tout' },
  { key: 'semaine', label: 'Semaine RP' },
  { key: 'mois', label: 'Mois' },
  { key: 'custom', label: 'Personnalise' },
]

const MOIS_NOMS = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre']

function PeriodFilter({ mode, setMode, rpWeekOffset, setRpWeekOffset, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, customStart, setCustomStart, customEnd, setCustomEnd, dateRange }) {
  const btnStyle = (active) => ({
    padding: '4px 10px', fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace",
    border: '1px solid var(--border-color)', borderRadius: 3, cursor: 'pointer',
    background: active ? '#4B5320' : 'transparent', color: active ? '#fff' : 'var(--text-primary)',
    fontWeight: active ? 700 : 400, transition: 'all 0.2s'
  })
  const navBtn = { padding: '4px 8px', fontSize: '0.85rem', border: '1px solid var(--border-color)', borderRadius: 3, cursor: 'pointer', background: 'transparent', fontFamily: "'IBM Plex Mono', monospace" }

  return (
    <div className="paper-card" style={{ padding: '10px 16px', marginBottom: 'var(--space-lg)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Periode :</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {FILTER_MODES.map(m => (
          <button key={m.key} style={btnStyle(mode === m.key)} onClick={() => setMode(m.key)}>{m.label}</button>
        ))}
      </div>

      {mode === 'semaine' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button style={navBtn} onClick={() => setRpWeekOffset(o => o - 1)}>◀</button>
          <span style={{ fontSize: '0.8rem', fontFamily: "'IBM Plex Mono', monospace", minWidth: 140, textAlign: 'center' }}>
            {dateRange ? `${fmtDateShort(dateRange.start)} - ${fmtDateShort(dateRange.end)}` : '...'}
          </span>
          <button style={navBtn} onClick={() => setRpWeekOffset(o => o + 1)}>▶</button>
          {rpWeekOffset !== 0 && (
            <button style={{ ...navBtn, fontSize: '0.7rem', color: '#4B5320' }} onClick={() => setRpWeekOffset(0)}>Cette semaine</button>
          )}
        </div>
      )}

      {mode === 'mois' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select className="form-input" style={{ padding: '3px 6px', fontSize: '0.8rem', width: 'auto' }} value={selectedMonth} onChange={e => setSelectedMonth(+e.target.value)}>
            {MOIS_NOMS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select className="form-input" style={{ padding: '3px 6px', fontSize: '0.8rem', width: 'auto' }} value={selectedYear} onChange={e => setSelectedYear(+e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {mode === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.75rem' }}>Du</span>
          <input type="date" className="form-input" style={{ padding: '3px 6px', fontSize: '0.8rem', width: 'auto' }} value={customStart} onChange={e => setCustomStart(e.target.value)} />
          <span style={{ fontSize: '0.75rem' }}>Au</span>
          <input type="date" className="form-input" style={{ padding: '3px 6px', fontSize: '0.8rem', width: 'auto' }} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
        </div>
      )}

      {mode !== 'tout' && dateRange && (
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {fmtDate(dateRange.start)} - {fmtDate(dateRange.end)}
        </span>
      )}
    </div>
  )
}

// ==============================
// ANALYSIS ALGORITHM
// ==============================
function analyzeperiod(filteredEvents, dateRange, vpEventsWithFlags) {
  const batailles = filteredEvents.filter(e => e.type_event === 'attaque' || e.type_event === 'defense')
  // Use vpEvents with synchro flags if available, excluding synchro prises
  const vpEvts = vpEventsWithFlags 
    ? vpEventsWithFlags.filter(e => !(e.type_event === 'prise' && e.isSynchro))
    : filteredEvents.filter(e => e.type_event === 'prise' || e.type_event === 'perte')
  const allRelevant = [...batailles, ...vpEvts]

  if (allRelevant.length === 0) return null

  const result = { identity: {}, tactical: {}, performance: {}, dataQuality: {}, strengths: [], weaknesses: [], suggestions: [] }

  // === IDENTITY ===
  const days = dateRange ? Math.max(1, Math.round((dateRange.end - dateRange.start) / 86400000)) : 0
  result.identity.days = days
  result.identity.start = dateRange?.start
  result.identity.end = dateRange?.end
  result.identity.totalEvents = allRelevant.length

  // === TACTICAL PROFILE ===
  const attaques = batailles.filter(e => e.type_event === 'attaque')
  const defenses = batailles.filter(e => e.type_event === 'defense')
  const attPct = batailles.length > 0 ? attaques.length / batailles.length : 0.5
  const defPct = batailles.length > 0 ? defenses.length / batailles.length : 0.5
  result.tactical.attPct = Math.round(attPct * 100)
  result.tactical.defPct = Math.round(defPct * 100)
  result.tactical.profile = attPct > 0.6 ? 'offensive' : defPct > 0.6 ? 'defensive' : 'equilibree'

  const prises = vpEvts.filter(e => e.type_event === 'prise').length
  const pertes = vpEvts.filter(e => e.type_event === 'perte').length
  const vpNet = prises - pertes
  result.tactical.prises = prises
  result.tactical.pertes = pertes
  result.tactical.vpNet = vpNet
  result.tactical.territorial = vpNet > 0 ? 'avancee' : vpNet < 0 ? 'recul' : 'stable'

  // === PERFORMANCE ===
  const winAll = batailles.filter(e => e.camp_vainqueur === 'allemand').length
  const winUs = batailles.filter(e => e.camp_vainqueur === 'us').length
  const totalBat = winAll + winUs
  const winRate = totalBat > 0 ? Math.round(winAll / totalBat * 100) : 0
  result.performance.winRate = winRate
  result.performance.totalBat = totalBat

  // Trend: compare 1st half vs 2nd half
  if (batailles.length >= 4) {
    const sorted = [...batailles].sort((a, b) => new Date(a.date_irl) - new Date(b.date_irl))
    const mid = Math.floor(sorted.length / 2)
    const h1 = sorted.slice(0, mid), h2 = sorted.slice(mid)
    const wr1 = h1.length > 0 ? h1.filter(e => e.camp_vainqueur === 'allemand').length / h1.length : 0
    const wr2 = h2.length > 0 ? h2.filter(e => e.camp_vainqueur === 'allemand').length / h2.length : 0
    result.performance.trend = wr2 > wr1 + 0.1 ? 'hausse' : wr2 < wr1 - 0.1 ? 'baisse' : 'stable'
    result.performance.wr1 = Math.round(wr1 * 100)
    result.performance.wr2 = Math.round(wr2 * 100)
  }

  // Best time slot
  const slots = { '14-17h': { win: 0, total: 0 }, '17-20h': { win: 0, total: 0 }, '20-23h': { win: 0, total: 0 } }
  let noHour = 0
  batailles.forEach(e => {
    if (!e.heure) { noHour++; return }
    const h = parseInt(e.heure.split(':')[0] || e.heure.split('h')[0])
    const slot = h >= 14 && h < 17 ? '14-17h' : h >= 17 && h < 20 ? '17-20h' : h >= 20 && h < 23 ? '20-23h' : null
    if (slot) {
      slots[slot].total++
      if (e.camp_vainqueur === 'allemand') slots[slot].win++
    }
  })
  const bestSlot = Object.entries(slots).filter(([,v]) => v.total >= 2).sort((a, b) => {
    const wrA = a[1].total > 0 ? a[1].win / a[1].total : 0
    const wrB = b[1].total > 0 ? b[1].win / b[1].total : 0
    return wrB - wrA
  })[0]
  if (bestSlot) {
    result.performance.bestSlot = bestSlot[0]
    result.performance.bestSlotWr = Math.round((bestSlot[1].win / bestSlot[1].total) * 100)
  }

  // Most active map
  const mapCount = {}
  allRelevant.forEach(e => {
    const m = e.carte_nom || 'Inconnue'
    mapCount[m] = (mapCount[m] || 0) + 1
  })
  const topMap = Object.entries(mapCount).sort((a, b) => b[1] - a[1])[0]
  if (topMap) result.performance.topMap = { name: topMap[0], count: topMap[1] }

  // Most disputed VP
  const vpCount = {}
  vpEvts.forEach(e => {
    const vpName = e.vp_nom || e.vp_numero || 'VP inconnu'
    vpCount[vpName] = (vpCount[vpName] || 0) + 1
  })
  const topVP = Object.entries(vpCount).sort((a, b) => b[1] - a[1])[0]
  if (topVP && topVP[1] >= 2) result.performance.topVP = { name: topVP[0], count: topVP[1] }

  // === DATA QUALITY ===
  const pctNoHour = batailles.length > 0 ? noHour / batailles.length : 0
  result.dataQuality.pctNoHour = Math.round(pctNoHour * 100)
  result.dataQuality.warning = pctNoHour > 0.3

  // === STRENGTHS ===
  if (winRate > 60) result.strengths.push('Excellent taux de victoire en bataille')
  if (vpNet > 0) result.strengths.push(`Gain territorial net de +${vpNet} VP`)
  const defWinAll = defenses.filter(e => e.camp_vainqueur === 'allemand').length
  const defTotal = defenses.length
  const defWr = defTotal > 0 ? defWinAll / defTotal : 0
  if (defWr > 0.7 && defTotal >= 3) result.strengths.push('Base tres bien defendue')
  const attWinAll = attaques.filter(e => e.camp_vainqueur === 'allemand').length
  const attTotal = attaques.length
  const attWr = attTotal > 0 ? attWinAll / attTotal : 0
  if (attWr > 0.7 && attTotal >= 3) result.strengths.push('Attaques tres efficaces')

  // === WEAKNESSES ===
  if (winRate < 40 && totalBat >= 3) result.weaknesses.push('Taux de victoire faible, revoir la strategie')
  if (attWr < 0.3 && attTotal >= 3) result.weaknesses.push('Attaques peu efficaces')

  // Evening losses check
  const eveningBat = batailles.filter(e => {
    if (!e.heure) return false
    const h = parseInt(e.heure.split(':')[0] || e.heure.split('h')[0])
    return h >= 21
  })
  const eveningLosses = eveningBat.filter(e => e.camp_vainqueur === 'us').length
  if (eveningBat.length >= 3 && eveningLosses / eveningBat.length > 0.6) {
    result.weaknesses.push('Performance en baisse apres 21h')
  }

  if (vpNet < -2) result.weaknesses.push('Recul territorial significatif')

  // === SUGGESTIONS ===
  if (vpNet < 0) result.suggestions.push('Renforcer les VP apres capture')
  if (attWr < 0.3 && attTotal >= 3) result.suggestions.push('Privilegier la defense ou preparer mieux les attaques')
  if (result.performance.topMap && winRate < 50) {
    result.suggestions.push(`Revoir la tactique sur ${result.performance.topMap.name}`)
  }
  if (pctNoHour > 0.3) result.suggestions.push('Ameliorer la saisie des heures pour de meilleures analyses')
  if (eveningLosses > 2) result.suggestions.push('Eviter les engagements apres 21h ou renforcer les effectifs en soiree')

  return result
}

// ==============================
// AI ANALYSIS PARSER (Feature 4)
// ==============================
function parseAiAnalysis(text) {
  const sections = []
  const lines = text.split('\n')
  let currentSection = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Detect section headers
    const headerMatch = trimmed.match(/^(PROFIL TACTIQUE|PERFORMANCE|POINTS FORTS|POINTS FAIBLES|SUGGESTIONS|RESUME)\s*:\s*(.*)/i)
    if (headerMatch) {
      currentSection = { title: headerMatch[1].toUpperCase(), content: headerMatch[2] ? [headerMatch[2]] : [], items: [] }
      sections.push(currentSection)
      continue
    }

    if (currentSection) {
      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        currentSection.items.push(trimmed.slice(2))
      } else {
        currentSection.content.push(trimmed)
      }
    }
  }

  return sections
}

function AiAnalysisDisplay({ sections }) {
  const sectionStyles = {
    'PROFIL TACTIQUE': { icon: '\u{1F3AF}', borderColor: '#556B2F', bg: 'rgba(85,107,47,0.08)' },
    'PERFORMANCE': { icon: '\u{1F4CA}', borderColor: '#2E5090', bg: 'rgba(46,80,144,0.08)' },
    'POINTS FORTS': { icon: '\u2714', borderColor: '#4B5320', bg: 'rgba(75,83,32,0.08)', itemColor: '#4B5320' },
    'POINTS FAIBLES': { icon: '\u26A0\uFE0F', borderColor: '#DAA520', bg: 'rgba(218,165,32,0.08)', itemColor: '#8B6914' },
    'SUGGESTIONS': { icon: '\u{1F4A1}', borderColor: '#2E5090', bg: 'rgba(46,80,144,0.06)', itemColor: '#2E5090' },
    'RESUME': { icon: '\u{1F4DD}', borderColor: '#4B5320', bg: 'rgba(75,83,32,0.06)' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sections.map((sec, i) => {
        const style = sectionStyles[sec.title] || { icon: '\u{1F4CB}', borderColor: '#708090', bg: 'rgba(0,0,0,0.04)' }
        return (
          <div key={i} style={{ padding: '10px 14px', background: style.bg, borderRadius: 4, borderLeft: `3px solid ${style.borderColor}` }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: style.borderColor }}>
              {style.icon} {sec.title}
            </div>
            {sec.content.length > 0 && (
              <div style={{ fontSize: '0.8rem', lineHeight: 1.5, marginBottom: sec.items.length ? 6 : 0 }}>
                {sec.content.join(' ')}
              </div>
            )}
            {sec.items.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {sec.items.map((item, j) => (
                  <div key={j} style={{
                    padding: '4px 8px', fontSize: '0.78rem',
                    color: style.itemColor || 'inherit',
                    borderLeft: `2px solid ${style.borderColor}`,
                    marginLeft: 8, lineHeight: 1.4
                  }}>
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ==============================
// ANALYSIS DISPLAY COMPONENT (with AI toggle)
// ==============================
function AnalysisBlock({ analysis, filteredEvents, dateRange, correlation, combatHours, rapports = [] }) {
  const [aiMode, setAiMode] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiError, setAiError] = useState(null)
  const [rapportAiLoading, setRapportAiLoading] = useState(false)
  const [rapportAiResult, setRapportAiResult] = useState(null)
  const [rapportAiError, setRapportAiError] = useState(null)
  const [correleLoading, setCorreleLoading] = useState(false)
  const [correleResult, setCorreleResult] = useState(null)
  const [correleError, setCorreleError] = useState(null)
  const [activeAnalysis, setActiveAnalysis] = useState(null) // 'front' | 'rapports' | 'correle'

  const handleAiAnalysis = useCallback(async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const payload = {
        events: filteredEvents.map(e => ({
          type_event: e.type_event,
          camp_vainqueur: e.camp_vainqueur,
          carte_nom: e.carte_nom,
          heure: e.heure,
          date_irl: e.date_irl,
          vp_nom: e.vp_nom,
          vp_numero: e.vp_numero,
        })),
        periode: dateRange ? {
          debut: fmtDate(dateRange.start),
          fin: fmtDate(dateRange.end)
        } : {},
        pdsData: correlation ? {
          nb_effectifs: correlation.nb_effectifs,
          total_heures: correlation.total_heures,
          semaines: correlation.semaines?.length || 0
        } : null,
        combatHours: combatHours && combatHours.daysWithCombat > 0 ? {
          totalFormatted: combatHours.totalFormatted,
          avgFormatted: combatHours.avgFormatted,
          daysWithCombat: combatHours.daysWithCombat,
          totalEventsWithHour: combatHours.totalEventsWithHour
        } : null,
        rapports: rapports.length > 0 ? rapports.map(r => ({
          titre: r.titre, auteur_nom: r.auteur_nom, auteur_grade: r.auteur_grade,
          date_irl: r.date_irl, contexte: r.contexte, resume: r.resume,
          bilan: r.bilan, remarques: r.remarques, conclusion: r.conclusion
        })) : undefined
      }
      const res = await api.post('/front/analyse', payload)
      if (res.data.success && res.data.data?.analysis) {
        setAiResult(res.data.data.analysis)
        setAiMode(true)
      } else {
        setAiError(res.data.message || 'Erreur analyse IA')
        setAiMode(false)
      }
    } catch (err) {
      setAiError('Erreur de connexion au serveur')
      setAiMode(false)
    } finally {
      setAiLoading(false)
    }
  }, [filteredEvents, dateRange, correlation, combatHours, rapports])

  const handleRapportAiAnalysis = useCallback(async () => {
    setRapportAiLoading(true)
    setRapportAiError(null)
    try {
      const body = { periode: 'custom', include_front: false }
      if (dateRange) {
        body.date_debut = toYMD(dateRange.start)
        body.date_fin = toYMD(dateRange.end)
      }
      const res = await api.post('/rapports/analyse-ia', body)
      if (res.data.success && res.data.data?.analyse) {
        setRapportAiResult(res.data.data.analyse)
        setActiveAnalysis('rapports')
      } else {
        setRapportAiError(res.data.message || 'Erreur')
      }
    } catch (err) {
      setRapportAiError('Erreur de connexion')
    } finally { setRapportAiLoading(false) }
  }, [dateRange])

  const handleCorreleAnalysis = useCallback(async () => {
    setCorreleLoading(true)
    setCorreleError(null)
    try {
      const body = { periode: 'custom', include_front: true }
      if (dateRange) {
        body.date_debut = toYMD(dateRange.start)
        body.date_fin = toYMD(dateRange.end)
      }
      const res = await api.post('/rapports/analyse-ia', body)
      if (res.data.success && res.data.data?.analyse) {
        setCorreleResult(res.data.data.analyse)
        setActiveAnalysis('correle')
      } else {
        setCorreleError(res.data.message || 'Erreur')
      }
    } catch (err) {
      setCorreleError('Erreur de connexion')
    } finally { setCorreleLoading(false) }
  }, [dateRange])

  if (!analysis) return (
    <div className="document-paper" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      Pas assez de donnees pour generer une analyse.
    </div>
  )

  const { identity: id, tactical: tac, performance: perf, dataQuality: dq, strengths, weaknesses, suggestions } = analysis

  const profileLabels = { offensive: 'Periode offensive', defensive: 'Periode defensive', equilibree: 'Equilibree' }
  const territorialLabels = { avancee: 'Avancee territoriale', recul: 'Recul territorial', stable: 'Stable' }
  const trendLabels = { hausse: '\u{1F4C8} En hausse', baisse: '\u{1F4C9} En baisse', stable: '\u27A1\uFE0F Stable' }

  const aiSections = aiResult ? parseAiAnalysis(aiResult) : []

  return (
    <div className="document-paper" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>
      {/* Header with AI toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>📋 Analyse de la periode</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {aiMode && (
            <button
              className="btn btn-secondary btn-small"
              style={{ fontSize: '0.75rem', padding: '4px 10px', fontFamily: "'IBM Plex Mono', monospace" }}
              onClick={() => { setAiMode(false); setActiveAnalysis(null) }}
            >
              📊 Analyse standard
            </button>
          )}
          <button
            className="btn btn-secondary btn-small"
            style={{
              fontSize: '0.75rem', padding: '4px 10px', fontFamily: "'IBM Plex Mono', monospace",
              opacity: aiLoading ? 0.6 : 1, cursor: aiLoading ? 'wait' : 'pointer',
              background: activeAnalysis === 'front' ? '#4B5320' : undefined, color: activeAnalysis === 'front' ? '#fff' : undefined,
              border: activeAnalysis === 'front' ? '1px solid #4B5320' : undefined
            }}
            onClick={() => { handleAiAnalysis(); setActiveAnalysis('front') }}
            disabled={aiLoading || rapportAiLoading || correleLoading}
          >
            {aiLoading ? '⏳ ...' : '⚔️ Front IA'}
          </button>
          <button
            className="btn btn-secondary btn-small"
            style={{
              fontSize: '0.75rem', padding: '4px 10px', fontFamily: "'IBM Plex Mono', monospace",
              opacity: rapportAiLoading ? 0.6 : 1, cursor: rapportAiLoading ? 'wait' : 'pointer',
              background: activeAnalysis === 'rapports' ? '#4B5320' : undefined, color: activeAnalysis === 'rapports' ? '#fff' : undefined,
              border: activeAnalysis === 'rapports' ? '1px solid #4B5320' : undefined
            }}
            onClick={handleRapportAiAnalysis}
            disabled={aiLoading || rapportAiLoading || correleLoading}
          >
            {rapportAiLoading ? '⏳ ...' : '📜 Rapports IA'}
          </button>
          <button
            className="btn btn-secondary btn-small"
            style={{
              fontSize: '0.75rem', padding: '4px 10px', fontFamily: "'IBM Plex Mono', monospace",
              opacity: correleLoading ? 0.6 : 1, cursor: correleLoading ? 'wait' : 'pointer',
              background: activeAnalysis === 'correle' ? '#4B5320' : undefined, color: activeAnalysis === 'correle' ? '#fff' : undefined,
              border: activeAnalysis === 'correle' ? '1px solid #4B5320' : undefined
            }}
            onClick={handleCorreleAnalysis}
            disabled={aiLoading || rapportAiLoading || correleLoading}
          >
            {correleLoading ? '⏳ ...' : '🔗 Corrélé'}
          </button>
        </div>
      </div>

      {/* AI Error */}
      {aiError && (
        <div style={{ padding: '8px 12px', background: 'rgba(139,0,0,0.08)', borderRadius: 4, marginBottom: 12, fontSize: '0.8rem', color: '#8B0000', borderLeft: '3px solid #8B0000' }}>
          ❌ {aiError} — affichage de l'analyse standard
        </div>
      )}

      {/* Rapport AI result */}
      {rapportAiError && (
        <div style={{ padding: '8px 12px', background: 'rgba(139,0,0,0.08)', borderRadius: 4, marginBottom: 12, fontSize: '0.8rem', color: '#8B0000', borderLeft: '3px solid #8B0000' }}>
          ❌ {rapportAiError}
        </div>
      )}
      {activeAnalysis === 'rapports' && rapportAiResult && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ padding: '10px 14px', background: 'rgba(139,115,85,0.06)', borderRadius: 6, border: '1px solid rgba(139,115,85,0.15)', fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {rapportAiResult.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: '1rem', marginTop: '1rem', marginBottom: '0.3rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>{line.replace('## ', '')}</h3>
              if (line.startsWith('- ')) return <div key={i} style={{ paddingLeft: '1rem', marginBottom: 2 }}>• {line.slice(2)}</div>
              if (line.trim() === '') return <div key={i} style={{ height: 6 }} />
              return <p key={i} style={{ margin: '2px 0' }}>{line}</p>
            })}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>📜 Analyse IA des rapports (Llama 3.3 70B)</div>
        </div>
      )}
      {correleError && (
        <div style={{ padding: '8px 12px', background: 'rgba(139,0,0,0.08)', borderRadius: 4, marginBottom: 12, fontSize: '0.8rem', color: '#8B0000', borderLeft: '3px solid #8B0000' }}>
          ❌ {correleError}
        </div>
      )}
      {activeAnalysis === 'correle' && correleResult && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ padding: '10px 14px', background: 'rgba(75,83,32,0.06)', borderRadius: 6, border: '1px solid rgba(75,83,32,0.15)', fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {correleResult.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: '1rem', marginTop: '1rem', marginBottom: '0.3rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>{line.replace('## ', '')}</h3>
              if (line.startsWith('- ')) return <div key={i} style={{ paddingLeft: '1rem', marginBottom: 2 }}>• {line.slice(2)}</div>
              if (line.trim() === '') return <div key={i} style={{ height: 6 }} />
              return <p key={i} style={{ margin: '2px 0' }}>{line}</p>
            })}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>🔗 Analyse corrélée Front + Rapports + PDS (Llama 3.3 70B)</div>
        </div>
      )}

      {/* Always show rule-based KPI cards (identity + tactical + performance) */}
      <div>
          {/* Identity */}
          {id.start && id.end && (
            <div style={{ textAlign: 'center', marginBottom: 16, padding: '8px 12px', background: 'rgba(75,83,32,0.08)', borderRadius: 4, fontSize: '0.85rem' }}>
              <strong>Du {fmtDate(id.start)} au {fmtDate(id.end)}</strong> — {id.days} jour{id.days > 1 ? 's' : ''} de combat, {id.totalEvents} evenement{id.totalEvents > 1 ? 's' : ''}
            </div>
          )}

          {/* Tactical Profile */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.03)', borderRadius: 4, borderLeft: '3px solid #556B2F' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>Profil tactique</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{profileLabels[tac.profile]}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tac.attPct}% attaques / {tac.defPct}% defenses</div>
            </div>
            <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.03)', borderRadius: 4, borderLeft: `3px solid ${tac.vpNet >= 0 ? '#4B5320' : '#8B0000'}` }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>Territoire</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{territorialLabels[tac.territorial]}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{tac.prises} prises / -{tac.pertes} pertes = {tac.vpNet >= 0 ? '+' : ''}{tac.vpNet} net</div>
            </div>
          </div>

          {/* Performance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
            <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Win Rate</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: perf.winRate >= 50 ? '#4B5320' : '#8B0000', fontFamily: "'IBM Plex Mono', monospace" }}>{perf.winRate}%</div>
              {perf.trend && <div style={{ fontSize: '0.72rem' }}>{trendLabels[perf.trend]} ({perf.wr1}% → {perf.wr2}%)</div>}
            </div>
            {perf.bestSlot && (
              <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: 4, textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Meilleur creneau</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{perf.bestSlot}</div>
                <div style={{ fontSize: '0.72rem' }}>{perf.bestSlotWr}% win rate</div>
              </div>
            )}
            {perf.topMap && (
              <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: 4, textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Carte la plus active</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{perf.topMap.name}</div>
                <div style={{ fontSize: '0.72rem' }}>{perf.topMap.count} evenements</div>
              </div>
            )}
            {perf.topVP && (
              <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: 4, textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>VP le plus dispute</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{perf.topVP.name}</div>
                <div style={{ fontSize: '0.72rem' }}>{perf.topVP.count} mouvements</div>
              </div>
            )}
          </div>

          {/* Data Quality Warning */}
          {dq.warning && (
            <div style={{ padding: '8px 12px', background: 'rgba(218,165,32,0.12)', borderRadius: 4, marginBottom: 16, fontSize: '0.8rem', color: '#8B6914', borderLeft: '3px solid #DAA520' }}>
              ⚠ {dq.pctNoHour}% d'evenements sans heure renseignee — les analyses horaires sont approximatives
            </div>
          )}

          {/* Strengths & Weaknesses */}
          {(strengths.length > 0 || weaknesses.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: strengths.length > 0 && weaknesses.length > 0 ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 16 }}>
              {strengths.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#4B5320' }}>Points forts</div>
                  {strengths.map((s, i) => (
                    <div key={i} style={{ padding: '6px 10px', marginBottom: 4, background: 'rgba(75,83,32,0.08)', borderRadius: 3, fontSize: '0.78rem', color: '#4B5320', borderLeft: '3px solid #4B5320' }}>
                      ✔ {s}
                    </div>
                  ))}
                </div>
              )}
              {weaknesses.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#DAA520' }}>Points faibles</div>
                  {weaknesses.map((w, i) => (
                    <div key={i} style={{ padding: '6px 10px', marginBottom: 4, background: 'rgba(218,165,32,0.08)', borderRadius: 3, fontSize: '0.78rem', color: '#8B6914', borderLeft: '3px solid #DAA520' }}>
                      ⚠ {w}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div style={{ padding: '10px 14px', background: 'rgba(46,80,144,0.06)', borderRadius: 4, borderLeft: '3px solid #2E5090' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 6, color: '#2E5090' }}>Suggestions</div>
              {suggestions.map((s, i) => (
                <div key={i} style={{ fontSize: '0.78rem', marginBottom: 3, color: '#2E5090' }}>💡 {s}</div>
              ))}
            </div>
          )}
        </div>

      {/* AI Mode Display — shown BELOW the rule-based cards */}
      {aiMode && aiSections.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ padding: '6px 10px', background: 'rgba(75,83,32,0.1)', borderRadius: 4, marginBottom: 14, fontSize: '0.75rem', color: '#4B5320', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace" }}>
            🤖 Analyse generee par IA (Llama 3.3 70B)
          </div>
          <AiAnalysisDisplay sections={aiSections} />
        </div>
      )}
    </div>
  )
}

// ==============================
// MAIN COMPONENT
// ==============================
export default function Statistiques({ embedded = false }) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [cartes, setCartes] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [filterMode, setFilterMode] = useState('tout')
  const [rpWeekOffset, setRpWeekOffset] = useState(0)
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Correlation state
  const [correlation, setCorrelation] = useState(null)
  const [corrLoading, setCorrLoading] = useState(false)

  // Rapports state (Feature 5)
  const [rapports, setRapports] = useState([])
  const [rapportsLoading, setRapportsLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/front/events').then(r => r.data.data || []),
      api.get('/front/cartes').then(r => r.data.data || [])
    ]).then(([ev, ca]) => { setEvents(ev); setCartes(ca); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  // Compute date range from filter
  const dateRange = useMemo(() => {
    if (filterMode === 'tout') return null

    if (filterMode === 'semaine') {
      const ref = new Date()
      ref.setDate(ref.getDate() + rpWeekOffset * 7)
      const { start, end } = getRpWeekBounds(ref)
      return { start, end }
    }

    if (filterMode === 'mois') {
      const start = new Date(selectedYear, selectedMonth, 1)
      const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59)
      return { start, end }
    }

    if (filterMode === 'custom' && customStart && customEnd) {
      return { start: new Date(customStart + 'T00:00:00'), end: new Date(customEnd + 'T23:59:59') }
    }

    return null
  }, [filterMode, rpWeekOffset, selectedMonth, selectedYear, customStart, customEnd])

  // Filter events by date range
  const filteredEvents = useMemo(() => {
    if (!dateRange) return events
    return events.filter(e => {
      const d = new Date(e.date_irl || e.created_at)
      return d >= dateRange.start && d <= dateRange.end
    })
  }, [events, dateRange])

  // Fetch correlation data + rapports when date range changes
  useEffect(() => {
    if (!dateRange) { setCorrelation(null); setRapports([]); return }
    const startStr = toYMD(dateRange.start)
    const endStr = toYMD(dateRange.end)
    setCorrLoading(true)
    api.get(`/front/correlation?date_debut=${startStr}&date_fin=${endStr}`)
      .then(r => { setCorrelation(r.data.data || null); setCorrLoading(false) })
      .catch(() => { setCorrelation(null); setCorrLoading(false) })
    // Fetch rapports
    setRapportsLoading(true)
    api.get(`/front/rapports?date_debut=${startStr}&date_fin=${endStr}`)
      .then(r => { setRapports(r.data.data || []); setRapportsLoading(false) })
      .catch(() => { setRapports([]); setRapportsLoading(false) })
  }, [dateRange])

  // Split events properly
  const batailles = useMemo(() => filteredEvents.filter(e => e.type_event === 'attaque' || e.type_event === 'defense'), [filteredEvents])
  const sessions = useMemo(() => filteredEvents.filter(e => e.type_event === 'debut'), [filteredEvents])

  // VP events with "prise synchro" filtering
  // Prises synchro = initial VP1+VP2 captures at start of session or after attaque/defense (Berlin & Falaise)
  const vpEvents = useMemo(() => {
    const allVP = filteredEvents.filter(e => e.type_event === 'prise' || e.type_event === 'perte')
    // Group events by date to detect synchro captures per session
    const byDate = {}
    filteredEvents.forEach(e => {
      const d = e.date_irl || (e.created_at && e.created_at.slice(0, 10))
      if (!d) return
      if (!byDate[d]) byDate[d] = []
      byDate[d].push(e)
    })

    const synchroIds = new Set()
    Object.values(byDate).forEach(dayEvents => {
      // Sort by heure then id
      const sorted = [...dayEvents].sort((a, b) => {
        if (a.heure && b.heure) return a.heure.localeCompare(b.heure)
        return (a.id || 0) - (b.id || 0)
      })

      // Find synchro prises: first prises at start of actif (before any bataille/perte) or right after attaque/defense
      let afterBataille = true // start of day = start of actif = synchro zone
      let synchroPrisesCount = 0

      for (const evt of sorted) {
        if (evt.type_event === 'debut') {
          afterBataille = true
          synchroPrisesCount = 0
          continue
        }
        if (evt.type_event === 'attaque' || evt.type_event === 'defense') {
          afterBataille = true
          synchroPrisesCount = 0
          continue
        }
        if (evt.type_event === 'prise' && afterBataille) {
          const vpNum = parseInt(evt.vp_numero) || 0
          // Berlin: first 2 VP captures are synchro (VP1+VP2 zone)
          // Falaise/linear: first VP capture (up to VP2) is synchro
          if (synchroPrisesCount < 2 && vpNum <= 2) {
            synchroIds.add(evt.id)
            synchroPrisesCount++
            continue
          }
          afterBataille = false
        }
        if (evt.type_event === 'perte') {
          afterBataille = false
        }
      }
    })

    // Tag VP events with synchro flag
    return allVP.map(e => ({ ...e, isSynchro: synchroIds.has(e.id) }))
  }, [filteredEvents])

  // === BATAILLE STATS ===
  const batStats = useMemo(() => {
    const attAll = batailles.filter(e => e.type_event === 'attaque' && e.camp_vainqueur === 'allemand').length
    const attUs = batailles.filter(e => e.type_event === 'attaque' && e.camp_vainqueur === 'us').length
    const defAll = batailles.filter(e => e.type_event === 'defense' && e.camp_vainqueur === 'allemand').length
    const defUs = batailles.filter(e => e.type_event === 'defense' && e.camp_vainqueur === 'us').length
    const winAll = attAll + defAll, winUs = attUs + defUs, total = winAll + winUs
    const winRate = total > 0 ? Math.round(winAll / total * 100) : 0
    return { attAll, attUs, defAll, defUs, winAll, winUs, total, winRate }
  }, [batailles])

  // === VP STATS (excluding synchro prises) ===
  const vpStats = useMemo(() => {
    const realPrises = vpEvents.filter(e => e.type_event === 'prise' && !e.isSynchro).length
    const synchroPrises = vpEvents.filter(e => e.type_event === 'prise' && e.isSynchro).length
    const pertes = vpEvents.filter(e => e.type_event === 'perte').length
    const totalPrises = vpEvents.filter(e => e.type_event === 'prise').length
    return { prises: realPrises, synchroPrises, totalPrises, pertes, net: realPrises - pertes }
  }, [vpEvents])

  // === PIE DATA ===
  const bataillePie = useMemo(() => [
    { label: 'Att. Win ALL', value: batStats.attAll, color: COLORS.attAll },
    { label: 'Att. Win US', value: batStats.attUs, color: COLORS.attUs },
    { label: 'Def. Win ALL', value: batStats.defAll, color: COLORS.defAll },
    { label: 'Def. Win US', value: batStats.defUs, color: COLORS.defUs },
  ].filter(d => d.value > 0), [batStats])

  const vpPie = useMemo(() => [
    { label: 'Prises VP (reelles)', value: vpStats.prises, color: COLORS.prise },
    { label: 'Pertes VP', value: vpStats.pertes, color: COLORS.perte },
    ...(vpStats.synchroPrises > 0 ? [{ label: 'Prises synchro', value: vpStats.synchroPrises, color: COLORS.neutral }] : []),
  ].filter(d => d.value > 0), [vpStats])

  // === COMPOSITE CHART: VP & Batailles per session (Fix 2) ===
  // Only days with at least 1 event (no empty days)
  const sessionCompositeData = useMemo(() => {
    const allRelevant = [...filteredEvents.filter(e => 
      e.type_event === 'attaque' || e.type_event === 'defense' || 
      e.type_event === 'prise' || e.type_event === 'perte'
    )]
    if (allRelevant.length === 0) return []

    // Group by day
    const dayMap = {}
    allRelevant.forEach(e => {
      const d = new Date(e.date_irl || e.created_at)
      const key = getDayKey(d)
      if (!dayMap[key]) dayMap[key] = { winAll: 0, winUs: 0, prises: 0, pertes: 0, date: d, label: fmtDateShort(d) }
      if (e.type_event === 'attaque' || e.type_event === 'defense') {
        if (e.camp_vainqueur === 'allemand') dayMap[key].winAll++
        else dayMap[key].winUs++
      }
    })
    // VP events (exclude synchro)
    vpEvents.forEach(e => {
      const d = new Date(e.date_irl || e.created_at)
      const key = getDayKey(d)
      if (!dayMap[key]) dayMap[key] = { winAll: 0, winUs: 0, prises: 0, pertes: 0, date: d, label: fmtDateShort(d) }
      if (e.type_event === 'prise' && !e.isSynchro) dayMap[key].prises++
      else if (e.type_event === 'perte') dayMap[key].pertes++
    })

    return Object.values(dayMap).sort((a, b) => a.date - b.date)
  }, [filteredEvents, vpEvents])

  // === VP movements for bar chart (Fix 3 — adaptive grouping) ===
  const vpBarData = useMemo(() => {
    // Determine grouping mode based on filter
    const useDaily = filterMode === 'mois' || filterMode === 'custom' || filterMode === 'semaine'

    if (useDaily && dateRange) {
      // Generate all days in the period
      const dayMap = {}
      const cur = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)

      while (cur <= endDate) {
        const key = getDayKey(cur)
        dayMap[key] = { label: getDayLabel(cur), prises: 0, pertes: 0, total: 0, date: new Date(cur) }
        cur.setDate(cur.getDate() + 1)
      }

      // Fill with actual data (exclude synchro prises)
      vpEvents.forEach(e => {
        const d = new Date(e.date_irl || e.created_at)
        const key = getDayKey(d)
        if (dayMap[key]) {
          if (e.type_event === 'prise' && !e.isSynchro) dayMap[key].prises++
          else if (e.type_event === 'perte') dayMap[key].pertes++
          dayMap[key].total = dayMap[key].prises + dayMap[key].pertes
        }
      })

      // Only keep days with data (or all days for semaine mode)
      let days = Object.values(dayMap).sort((a, b) => a.date - b.date)
      if (filterMode !== 'semaine') {
        days = days.filter(d => d.total > 0)
      }

      return days.map(d => ({
        ...d,
        segments: [
          { val: d.prises, color: COLORS.prise },
          { val: d.pertes, color: COLORS.perte },
        ]
      }))
    }

    // Default: group by RP week (for "tout" mode) — exclude synchro prises
    const map = {}
    vpEvents.forEach(e => {
      if (e.type_event === 'prise' && e.isSynchro) return
      const d = new Date(e.date_irl || e.created_at)
      const key = getWeekKey(d)
      if (!map[key]) map[key] = { label: getWeekLabel(d), prises: 0, pertes: 0, total: 0, date: d }
      const w = map[key]
      if (e.type_event === 'prise') w.prises++; else w.pertes++
      w.total = w.prises + w.pertes
    })
    return Object.values(map).sort((a, b) => a.date - b.date).map(w => ({
      ...w,
      segments: [
        { val: w.prises, color: COLORS.prise },
        { val: w.pertes, color: COLORS.perte },
      ]
    }))
  }, [vpEvents, filterMode, dateRange])

  // === PER-MAP stats (VP exclude synchro) ===
  const mapStats = useMemo(() => {
    const maps = {}
    // Combine filtered batailles + vpEvents (which have isSynchro flag)
    const allTagged = [...filteredEvents.filter(e => e.type_event === 'attaque' || e.type_event === 'defense'), ...vpEvents]
    allTagged.forEach(e => {
      const m = e.carte_nom || 'Inconnue'
      if (!maps[m]) maps[m] = { attAll: 0, attUs: 0, defAll: 0, defUs: 0, prises: 0, pertes: 0, batailles: 0 }
      const w = maps[m]
      if (e.type_event === 'prise' && !e.isSynchro) w.prises++
      else if (e.type_event === 'perte') w.pertes++
      else if (e.type_event === 'attaque') { w.batailles++; if (e.camp_vainqueur === 'allemand') w.attAll++; else w.attUs++ }
      else if (e.type_event === 'defense') { w.batailles++; if (e.camp_vainqueur === 'allemand') w.defAll++; else w.defUs++ }
    })
    return Object.entries(maps).sort((a, b) => b[1].batailles - a[1].batailles)
  }, [filteredEvents])

  // === HEURES DE COMBAT (Fix 2) — calculated from front events ===
  const combatHours = useMemo(() => {
    // Group events with hours by day
    const dayEvents = {}
    filteredEvents.forEach(e => {
      if (!e.heure || !e.date_irl) return
      const key = getDayKey(new Date(e.date_irl || e.created_at))
      if (!dayEvents[key]) dayEvents[key] = []
      dayEvents[key].push(e.heure)
    })
    
    let totalMinutes = 0
    let daysWithCombat = 0
    let totalEventsWithHour = 0
    
    Object.values(dayEvents).forEach(hours => {
      if (hours.length < 2) return // need at least 2 events to compute a duration
      // Parse all hours and sort
      const parsed = hours.map(h => {
        const parts = h.includes(':') ? h.split(':') : h.split('h')
        return parseInt(parts[0]) * 60 + parseInt(parts[1] || 0)
      }).filter(m => !isNaN(m)).sort((a, b) => a - b)
      
      if (parsed.length < 2) return
      
      const duration = parsed[parsed.length - 1] - parsed[0]
      if (duration > 0) {
        totalMinutes += duration
        daysWithCombat++
        totalEventsWithHour += parsed.length
      }
    })
    
    const totalH = Math.floor(totalMinutes / 60)
    const totalM = totalMinutes % 60
    const avgMinutes = daysWithCombat > 0 ? Math.round(totalMinutes / daysWithCombat) : 0
    const avgH = Math.floor(avgMinutes / 60)
    const avgM = avgMinutes % 60
    const perEventMinutes = totalEventsWithHour > 0 ? Math.round(totalMinutes / totalEventsWithHour) : 0
    const perEventH = Math.floor(perEventMinutes / 60)
    const perEventM = perEventMinutes % 60
    
    return {
      totalMinutes,
      totalFormatted: `${totalH}h ${String(totalM).padStart(2, '0')}min`,
      avgFormatted: `${avgH}h ${String(avgM).padStart(2, '0')}min`,
      perEventFormatted: `${perEventH}h ${String(perEventM).padStart(2, '0')}min`,
      daysWithCombat,
      totalEventsWithHour
    }
  }, [filteredEvents])

  // === ANALYSIS ===
  const analysis = useMemo(() => analyzeperiod(filteredEvents, dateRange, vpEvents), [filteredEvents, dateRange, vpEvents])

  if (loading) return embedded ? null : <div className="container"><p style={{ textAlign: 'center', padding: 40 }}>Chargement...</p></div>

  return (
    <div id="stats-front-full" className={embedded ? '' : 'container'} style={{ paddingBottom: embedded ? 0 : 'var(--space-xxl)' }}>
      {!embedded && <BackButton label="← Retour" />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ textAlign: 'center', fontSize: embedded ? '1.1rem' : '1.5rem', margin: 0 }}>📊 Statistiques — Situation du Front</h2>
        <button className="btn btn-secondary btn-small" onClick={() => exportToImage('stats-front-full', 'Stats_Front')}>🖼 Image</button>
      </div>

      {/* === PERIOD FILTER === */}
      <PeriodFilter
        mode={filterMode} setMode={setFilterMode}
        rpWeekOffset={rpWeekOffset} setRpWeekOffset={setRpWeekOffset}
        selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear} setSelectedYear={setSelectedYear}
        customStart={customStart} setCustomStart={setCustomStart}
        customEnd={customEnd} setCustomEnd={setCustomEnd}
        dateRange={dateRange}
      />

      {/* === KPI CARDS === */}
      <ExportableBlock id="stats-kpi" title="Stats_KPI">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {[
          { icon: '\u{1F514}', label: 'Sessions de combat', value: sessions.length, color: '#2F4F4F' },
          { icon: '\u2694\uFE0F', label: 'Batailles (assauts base)', value: batStats.total, color: '#2E5090' },
          { icon: '\u{1F3C6}', label: 'Win Rate ALL', value: `${batStats.winRate}%`, color: batStats.winRate >= 50 ? '#4B5320' : '#8B0000' },
          { icon: '\u{1F6A9}', label: 'VP Net', value: `${vpStats.net >= 0 ? '+' : ''}${vpStats.net}`, color: vpStats.net >= 0 ? '#4B5320' : '#8B0000' },
          { icon: '\u2705', label: 'Victoires ALL', value: batStats.winAll, color: '#4B5320' },
          { icon: '\u274C', label: 'Victoires US', value: batStats.winUs, color: '#8B0000' },
        ].map((s, i) => (
          <div key={i} className="paper-card" style={{ textAlign: 'center', borderTop: `3px solid ${s.color}`, padding: 'var(--space-md)' }}>
            <div style={{ fontSize: '1.3rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color, fontFamily: "'IBM Plex Mono', monospace" }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>
      </ExportableBlock>

      {/* === CORRELATION PDS / FRONT (Fix 1) === */}
      {dateRange && (
        <ExportableBlock id="stats-correlation" title="Stats_Correlation_PDS">
        <div className="paper-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>👥 Effectifs en poste (PDS)</h3>
          
          {/* Combat Hours from events (Fix 2) */}
          {combatHours.daysWithCombat > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#2E5090' }}>⏱ Heures de combat (calculees depuis les evenements)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)', marginBottom: 10 }}>
                <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(46,80,144,0.08)', borderRadius: 4 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2E5090', fontFamily: "'IBM Plex Mono', monospace" }}>{combatHours.totalFormatted}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total heures de combat</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(75,83,32,0.06)', borderRadius: 4 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#4B5320', fontFamily: "'IBM Plex Mono', monospace" }}>{combatHours.avgFormatted}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Moyenne par session ({combatHours.daysWithCombat} jours)</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(0,0,0,0.04)', borderRadius: 4 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#556B2F', fontFamily: "'IBM Plex Mono', monospace" }}>{combatHours.perEventFormatted}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Par evenement ({combatHours.totalEventsWithHour} events)</div>
                </div>
              </div>
              <div style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Calcul : pour chaque jour, duree = dernierEvent.heure - premierEvent.heure. Events sans heure ignores.
              </div>
            </div>
          )}

          {corrLoading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chargement correlation...</p>
          ) : correlation && correlation.nb_effectifs > 0 ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)', marginBottom: 12 }}>
                <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(75,83,32,0.06)', borderRadius: 4 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#4B5320', fontFamily: "'IBM Plex Mono', monospace" }}>{correlation.nb_effectifs}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Effectifs avec PDS valide</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(46,80,144,0.06)', borderRadius: 4 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2E5090', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {formatPdsHours(correlation.total_heures) || '0h 00min'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total heures PDS</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(0,0,0,0.04)', borderRadius: 4 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#556B2F', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {correlation.nb_events > 0 ? formatPdsHours(rawPdsHours(correlation.total_heures) / correlation.nb_events) || '\u2014' : '\u2014'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Heures PDS / evenement front</div>
                </div>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.04)', borderRadius: 4, fontSize: '0.82rem' }}>
                Pendant les {correlation.nb_events} evenement{correlation.nb_events > 1 ? 's' : ''} front de la periode,{' '}
                <strong>{correlation.nb_effectifs} effectif{correlation.nb_effectifs > 1 ? 's' : ''}</strong> etaient en poste, totalisant{' '}
                <strong>{formatPdsHours(correlation.total_heures) || '0h 00min'}</strong> de PDS valide sur {(() => { if (!dateRange) return correlation.semaines?.length || 0; const days = Math.round((dateRange.end - dateRange.start) / 86400000); return Math.max(1, Math.round(days / 7)); })()} semaine{(() => { if (!dateRange) return (correlation.semaines?.length || 0) > 1 ? 's' : ''; const days = Math.round((dateRange.end - dateRange.start) / 86400000); return Math.max(1, Math.round(days / 7)) > 1 ? 's' : ''; })()}.
              </div>
              {correlation.effectifs && correlation.effectifs.length > 0 && (
                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Detail par effectif ({correlation.effectifs.length})
                  </summary>
                  <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 6 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace" }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                          <th style={{ padding: '4px 6px', textAlign: 'left' }}>Grade</th>
                          <th style={{ padding: '4px 6px', textAlign: 'left' }}>Nom Prenom</th>
                          <th style={{ padding: '4px 6px', textAlign: 'left' }}>Unite</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right' }}>Heures</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right' }}>Semaines</th>
                        </tr>
                      </thead>
                      <tbody>
                        {correlation.effectifs.slice(0, 20).map((eff, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '3px 6px', fontWeight: 600 }}>{eff.grade_nom || '\u2014'}</td>
                            <td style={{ padding: '3px 6px' }}>{eff.prenom} {eff.nom}</td>
                            <td style={{ padding: '3px 6px' }}>{eff.unite_code || '\u2014'}</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 600 }}>{formatPdsHours(eff.total_heures) || '0h 00min'}</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right' }}>{eff.nb_semaines}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '12px 0' }}>Aucune donnee PDS pour cette periode.</p>
          )}
        </div>
        </ExportableBlock>
      )}

      {/* === BATAILLES BREAKDOWN === */}
      <ExportableBlock id="stats-batailles" title="Stats_Batailles">
      <div className="paper-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>⚔ Batailles — Breakdown ({batStats.total} total)</h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Bataille = assaut de base (attaque ou defense). Les prises/pertes de VP ne sont pas des batailles.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(240px, 1fr)', gap: 'var(--space-lg)', alignItems: 'center' }}>
          <div>
            <HBar label="Att. Win ALL" value={batStats.attAll} max={batStats.total} color={COLORS.attAll} />
            <HBar label="Att. Win US" value={batStats.attUs} max={batStats.total} color={COLORS.attUs} />
            <HBar label="Def. Win ALL" value={batStats.defAll} max={batStats.total} color={COLORS.defAll} />
            <HBar label="Def. Win US" value={batStats.defUs} max={batStats.total} color={COLORS.defUs} />
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(0,0,0,0.04)', borderRadius: 4, fontSize: '0.85rem' }}>
              <strong>Attaques :</strong> {batStats.attAll + batStats.attUs} ({batStats.attAll} win ALL / {batStats.attUs} win US)
              <br /><strong>Defenses :</strong> {batStats.defAll + batStats.defUs} ({batStats.defAll} win ALL / {batStats.defUs} win US)
              <br /><strong>Taux victoire ALL :</strong> <span style={{ color: batStats.winRate >= 50 ? '#4B5320' : '#8B0000', fontWeight: 700 }}>{batStats.winRate}%</span>
            </div>
          </div>
          <PieChart data={bataillePie} size={220} title="Repartition batailles" />
        </div>
      </div>
      </ExportableBlock>

      {/* === VP MOVEMENTS === */}
      <ExportableBlock id="stats-vp" title="Stats_VP">
      <div className="paper-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>🚩 Mouvements VP ({vpStats.prises + vpStats.pertes} comptabilises)</h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {vpStats.synchroPrises > 0 ? `${vpStats.synchroPrises} prises synchro (VP1/VP2 debut d'actif) exclues du comptage.` : 'Prises synchro VP1/VP2 exclues automatiquement.'}
          {' '}Les prises synchro = captures initiales sans combat reel.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(240px, 1fr)', gap: 'var(--space-lg)', alignItems: 'center' }}>
          <div>
            <HBar label="Prises" value={vpStats.prises} max={vpStats.prises + vpStats.pertes} color={COLORS.prise} />
            <HBar label="Pertes" value={vpStats.pertes} max={vpStats.prises + vpStats.pertes} color={COLORS.perte} />
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(0,0,0,0.04)', borderRadius: 4, fontSize: '0.85rem' }}>
              <strong>Bilan VP :</strong> +{vpStats.prises} / -{vpStats.pertes} = <span style={{ color: vpStats.net >= 0 ? '#4B5320' : '#8B0000', fontWeight: 700 }}>{vpStats.net >= 0 ? '+' : ''}{vpStats.net} net</span>
            </div>
          </div>
          <PieChart data={vpPie} size={220} title="Prises vs Pertes" />
        </div>
      </div>
      </ExportableBlock>

      {/* === COMPOSITE CHART: VP & Batailles par session (Fix 2) === */}
      {sessionCompositeData.length > 0 && (
        <div className="paper-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
          <CompositeChart
            data={sessionCompositeData}
            height={380}
            title={"\uD83D\uDCC8 Evolution VP & Batailles par session"}
          />
        </div>
      )}

      {/* === VP BAR CHART (Fix 3 — adaptive daily/weekly) === */}
      {vpBarData.length > 0 && (
        <div className="paper-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
          <BarChart
            data={vpBarData}
            height={300}
            title={`Mouvements VP ${filterMode === 'tout' ? 'hebdomadaires' : 'par jour'} (hors synchro)`}
            legend={[
              { label: 'Prises', color: COLORS.prise },
              { label: 'Pertes', color: COLORS.perte },
            ]}
          />
        </div>
      )}

      {/* === PER-MAP TABLE === */}
      <ExportableBlock id="stats-cartes" title="Stats_Cartes">
      <div className="paper-card" style={{ padding: 'var(--space-lg)' }}>
        <h3 style={{ margin: '0 0 12px', textAlign: 'center', fontSize: '1rem' }}>🗺 Statistiques par carte</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', fontFamily: "'IBM Plex Mono', monospace" }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Carte</th>
                <th style={{ padding: '6px 4px', textAlign: 'center' }} title="Assauts de base (attaque/defense)">Bat.</th>
                <th style={{ padding: '6px 4px', textAlign: 'center' }}>Att ✔</th>
                <th style={{ padding: '6px 4px', textAlign: 'center' }}>Att ❌</th>
                <th style={{ padding: '6px 4px', textAlign: 'center' }}>Def ✔</th>
                <th style={{ padding: '6px 4px', textAlign: 'center' }}>Def ❌</th>
                <th style={{ padding: '6px 4px', textAlign: 'center' }}>🚩</th>
                <th style={{ padding: '6px 4px', textAlign: 'center' }}>🏳</th>
                <th style={{ padding: '6px 4px', textAlign: 'center' }}>Win%</th>
              </tr>
            </thead>
            <tbody>
              {mapStats.map(([name, d], i) => {
                const winAll = d.attAll + d.defAll, total = d.batailles
                const winPct = total > 0 ? Math.round(winAll / total * 100) : 0
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{name}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700 }}>{total}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: COLORS.attAll }}>{d.attAll || '\u2014'}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: COLORS.attUs }}>{d.attUs || '\u2014'}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: COLORS.defAll }}>{d.defAll || '\u2014'}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: COLORS.defUs }}>{d.defUs || '\u2014'}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: COLORS.prise, fontWeight: 600 }}>{d.prises}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: COLORS.perte, fontWeight: 600 }}>{d.pertes}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: winPct >= 50 ? '#4B5320' : '#8B0000' }}>{winPct}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      </ExportableBlock>

      {/* === RAPPORTS DE LA PERIODE (Feature 5) === */}
      {dateRange && (
        <ExportableBlock id="stats-rapports" title="Stats_Rapports">
        <div className="paper-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>{"\uD83D\uDCCB"} Rapports de la periode</h3>
          {rapportsLoading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chargement des rapports...</p>
          ) : rapports.length > 0 ? (
            <div>
              <div style={{ padding: '6px 10px', background: 'rgba(75,83,32,0.08)', borderRadius: 4, marginBottom: 12, fontSize: '0.82rem', textAlign: 'center' }}>
                <strong>{rapports.length}</strong> rapport{rapports.length > 1 ? 's' : ''} sur la periode
              </div>
              {rapports.map((r, i) => (
                <details key={r.id || i} style={{ marginBottom: 8, border: '1px solid var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                  <summary style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem', background: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>
                      {r.date_irl ? fmtDateShort(new Date(r.date_irl)) : '??/??'}
                    </span>
                    <span style={{ fontWeight: 600 }}>{r.titre || 'Sans titre'}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      — {r.auteur_grade || ''} {r.auteur_nom || 'Inconnu'}
                    </span>
                  </summary>
                  <div style={{ padding: '10px 14px', fontSize: '0.8rem', lineHeight: 1.5 }}>
                    {r.resume && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>Resume</div>
                        <div>{r.resume}</div>
                      </div>
                    )}
                    {r.bilan && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>Bilan</div>
                        <div>{r.bilan}</div>
                      </div>
                    )}
                    {r.remarques && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>Remarques</div>
                        <div>{r.remarques}</div>
                      </div>
                    )}
                    {r.conclusion && (
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>Conclusion</div>
                        <div>{r.conclusion}</div>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '12px 0' }}>Aucun rapport valide pour cette periode.</p>
          )}
        </div>
        </ExportableBlock>
      )}

      {/* === PERIOD ANALYSIS (with AI toggle) === */}
      {filterMode !== 'tout' && (
        <AnalysisBlock
          analysis={analysis}
          filteredEvents={filteredEvents}
          dateRange={dateRange}
          correlation={correlation}
          combatHours={combatHours}
          rapports={rapports}
        />
      )}
    </div>
  )
}
