import BackButton from '../../components/BackButton'
import { useState, useEffect } from 'react'
import { formatDate } from '../../utils/dates'
import api from '../../api/client'
import { exportCsv } from '../../utils/exportCsv'

const TYPE_ICONS = { rapport: '📋', recommandation: '⭐', incident: '⚠️' }
const BAR_COLORS = ['var(--military-green)', '#3498db', '#e74c3c', '#f39c12']

export default function AdminStats() {
  const [stats, setStats] = useState(null)
  const [frontStats, setFrontStats] = useState(null)

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data)).catch(() => {})
    api.get('/front/stats').then(r => setFrontStats(r.data.data)).catch(() => {})
  }, [])

  if (!stats) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>Chargement...</div>

  const maxActivity = Math.max(1, ...(stats.activiteParSemaine || []).map(s => s.total))

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-xxl)', maxWidth: 1000 }}>
      <BackButton label="← Tableau de bord" />
      <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>📊 Statistiques</h1>

      {/* Counters grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        <StatCard value={stats.effectifs} label="Effectifs" icon="👤" />
        <StatCard value={stats.rapports} label="Rapports" icon="📜" />
        <StatCard value={stats.telegrammes} label="Télégrammes" icon="⚡" />
        <StatCard value={stats.affaires} label="Affaires" icon="⚖️" />
        <StatCard value={stats.visites} label="Visites méd." icon="🏥" />
        <StatCard value={stats.interdits_actifs} label="Interdits actifs" icon="🚫" color="var(--danger)" />
        <StatCard value={stats.users} label="Comptes actifs" icon="🔑" />
        <StatCard value={stats.decorations} label="Décorations" icon="🎖️" />
      </div>

      {/* Activity chart */}
      {(stats.activiteParSemaine || []).length > 0 && (
        <div className="paper-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ margin: '0 0 var(--space-md)', fontSize: '1rem' }}>📈 Activité par semaine</h2>
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 180, padding: '0 var(--space-sm)' }}>
            {(stats.activiteParSemaine || []).map((s, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{s.total}</span>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {s.rapports > 0 && <div style={{ height: Math.max(2, (s.rapports / maxActivity) * 140), background: BAR_COLORS[0], borderRadius: '3px 3px 0 0', transition: 'height 0.5s' }} title={`${s.rapports} rapports`} />}
                  {s.telegrammes > 0 && <div style={{ height: Math.max(2, (s.telegrammes / maxActivity) * 140), background: BAR_COLORS[1] }} title={`${s.telegrammes} télégrammes`} />}
                  {s.interdits > 0 && <div style={{ height: Math.max(2, (s.interdits / maxActivity) * 140), background: BAR_COLORS[2] }} title={`${s.interdits} interdits`} />}
                  {s.medical > 0 && <div style={{ height: Math.max(2, (s.medical / maxActivity) * 140), background: BAR_COLORS[3], borderRadius: '0 0 3px 3px' }} title={`${s.medical} médical`} />}
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.debut}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginTop: 'var(--space-md)', flexWrap: 'wrap' }}>
            <Legend color={BAR_COLORS[0]} label="Rapports" />
            <Legend color={BAR_COLORS[1]} label="Télégrammes" />
            <Legend color={BAR_COLORS[2]} label="Interdits" />
            <Legend color={BAR_COLORS[3]} label="Médical" />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        {/* Effectifs par unité */}
        <div className="paper-card" style={{ padding: 'var(--space-lg)' }}>
          <h3 style={{ margin: '0 0 var(--space-md)', fontSize: '0.95rem' }}>🏴 Effectifs par unité</h3>
          {(stats.parUnite || []).map((u, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: '4px 0', borderBottom: i < stats.parUnite.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: u.couleur || 'var(--military-green)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.8rem' }}>{u.code}. {u.nom}</span>
              <strong style={{ fontSize: '0.85rem' }}>{u.count}</strong>
              <div style={{ width: 80, height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (u.count / Math.max(1, stats.effectifs)) * 100)}%`, height: '100%', background: u.couleur || 'var(--military-green)', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Rapports par type */}
        <div className="paper-card" style={{ padding: 'var(--space-lg)' }}>
          <h3 style={{ margin: '0 0 var(--space-md)', fontSize: '0.95rem' }}>📜 Rapports par type</h3>
          {(stats.rapportsParType || []).map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: '6px 0', borderBottom: i < stats.rapportsParType.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
              <span style={{ fontSize: '1.2rem' }}>{TYPE_ICONS[r.type] || '📄'}</span>
              <span style={{ flex: 1, fontSize: '0.85rem', textTransform: 'capitalize' }}>{r.type}</span>
              <strong>{r.count}</strong>
            </div>
          ))}
          {(stats.rapportsParType || []).length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucun rapport</p>}
        </div>

        {/* Grades répartition */}
        <div className="paper-card" style={{ padding: 'var(--space-lg)' }}>
          <h3 style={{ margin: '0 0 var(--space-md)', fontSize: '0.95rem' }}>🎖️ Répartition des grades</h3>
          {(stats.gradesRepartition || []).map((g, i) => {
            const colors = { Officier: '#f39c12', 'Sous-officier': '#27ae60', Troupe: '#3498db' }
            return (
              <div key={i} style={{ marginBottom: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 2 }}>
                  <span>{g.categorie || 'Autre'}</span>
                  <strong>{g.count}</strong>
                </div>
                <div style={{ width: '100%', height: 12, background: 'var(--border-color)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${(g.count / Math.max(1, stats.effectifs)) * 100}%`, height: '100%', background: colors[g.categorie] || 'var(--military-green)', borderRadius: 6, transition: 'width 0.5s' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Top contributeurs */}
        <div className="paper-card" style={{ padding: 'var(--space-lg)' }}>
          <h3 style={{ margin: '0 0 var(--space-md)', fontSize: '0.95rem' }}>🏆 Top contributeurs</h3>
          {(stats.topContributeurs || []).map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: '4px 0', borderBottom: i < stats.topContributeurs.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
              <span style={{ fontSize: '1rem', width: 24, textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
              <span style={{ flex: 1, fontSize: '0.85rem' }}>{c.auteur_nom}</span>
              <strong>{c.count} rapports</strong>
            </div>
          ))}
          {(stats.topContributeurs || []).length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucun</p>}
        </div>
      </div>

      {/* PDS current week */}
      {stats.pds && (
        <div className="paper-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 var(--space-md)', fontSize: '0.95rem' }}>📋 PDS — Dernière semaine</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-xl)' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--military-green)' }}>{stats.pds.saisis}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Remplis</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{stats.pds.valides}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Validés (≥6h)</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }}>{stats.pds.saisis - stats.pds.valides}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Insuffisants</div>
            </div>
          </div>
        </div>
      )}

      {/* Derniers rapports */}
      <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>Derniers rapports</h2>
      <div className="paper-card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={th}>Type</th>
              <th style={th}>Titre</th>
              <th style={th}>Auteur</th>
              <th style={th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {(stats.derniers || []).map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={td}>{TYPE_ICONS[r.type] || '📄'} {r.type}</td>
                <td style={td}>{r.titre}</td>
                <td style={td}>{r.auteur_nom || '—'}</td>
                <td style={td}>{formatDate(r.date_irl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Front Stats */}
      {frontStats && (
        <div className="paper-card" style={{ padding: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
            <h3 style={{ margin: 0 }}>⚔️ Situation du Front</h3>
            <a href="/statistiques" className="btn btn-primary btn-small">📊 Statistiques détaillées</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <StatCard value={frontStats.prises} label="Prises" icon="🚩" />
            <StatCard value={frontStats.pertes} label="Pertes" icon="🏳️" color="var(--danger)" />
            <StatCard value={frontStats.attaques} label="Attaques" icon="🇺🇸" />
            <StatCard value={frontStats.defenses} label="Défenses" icon="🇩🇪" />
            <StatCard value={frontStats.victoires_all} label="Victoires ALL" icon="🏆" color="var(--success)" />
            <StatCard value={frontStats.victoires_us} label="Victoires US" icon="🏆" color="var(--danger)" />
          </div>
          {frontStats.daily?.length > 0 && (() => {
            const days = [...new Set(frontStats.daily.map(d => d.jour))].sort().reverse().slice(0, 14)
            return (
              <div>
                <h4>Activité par jour</h4>
                {days.map(day => {
                  const dd = frontStats.daily.filter(d => d.jour === day)
                  const p = dd.find(d => d.event_type === 'prise')?.c || 0
                  const l = dd.find(d => d.event_type === 'perte')?.c || 0
                  const a = dd.find(d => d.event_type === 'attaque')?.c || 0
                  const df = dd.find(d => d.event_type === 'defense')?.c || 0
                  const t = p + l + a + df
                  return (
                    <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: '0.8rem' }}>
                      <span style={{ minWidth: 80, fontFamily: 'var(--font-mono)' }}>{new Date(day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
                      <div style={{ flex: 1, display: 'flex', height: 18, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-card)' }}>
                        {p > 0 && <div style={{ width: `${p/t*100}%`, background: 'var(--military-green)' }} title={`${p} prises`} />}
                        {l > 0 && <div style={{ width: `${l/t*100}%`, background: 'var(--danger)' }} title={`${l} pertes`} />}
                        {a > 0 && <div style={{ width: `${a/t*100}%`, background: '#3498db' }} title={`${a} attaques`} />}
                        {df > 0 && <div style={{ width: `${df/t*100}%`, background: '#f39c12' }} title={`${df} défenses`} />}
                      </div>
                      <span style={{ minWidth: 30, textAlign: 'right' }}>{t}</span>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <Legend color="var(--military-green)" label="Prises" />
                  <Legend color="var(--danger)" label="Pertes" />
                  <Legend color="#3498db" label="Attaques" />
                  <Legend color="#f39c12" label="Défenses" />
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function StatCard({ value, label, icon, color = 'var(--military-green)' }) {
  return (
    <div className="paper-card" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value || 0}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{label}</div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
      <span>{label}</span>
    </div>
  )
}

const th = { textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontWeight: 700, color: 'var(--military-dark)' }
const td = { padding: 'var(--space-sm) var(--space-md)' }
