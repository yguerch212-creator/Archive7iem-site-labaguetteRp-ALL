import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import apiClient from '../api/client'
export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ effectifs: 0, rapports: 0, unites: 0, parUnite: [], derniers: [] })
  const [pending, setPending] = useState({ docs: 0, permissions: 0, total: 0 })
  const [notifs, setNotifs] = useState({ telegrammes: 0, total: 0 })

  const isPrivileged = user?.isAdmin || user?.isRecenseur || user?.isOfficier
  const [unitDetail, setUnitDetail] = useState(null)

  // Keep old UNIT_DETAILS for history popup compatibility
  const UNIT_DETAILS = {
    '914': { title: '914. Grenadier-Regiment', cmd: 'Oberstleutnant Ernst Heyna (†7.6.44), puis Major Böhmer', strength: '~3 000 hommes (3 bataillons)', sector: 'Secteur ouest — Isigny-sur-Mer / Grandcamp', history: 'Formé à partir des restes de la 321. Infanterie-Division. Vétérans du Front de l\'Est, notamment de Kursk.', composition: ['I. Bataillon', 'II. Bataillon', 'III. Bataillon', '13. Kp. (IG)', '14. Kp. (PaK)'], armament: 'Par bataillon : 60 MG 42, 3 sMG, 12 mortiers 8cm.', dday: 'Le 6 juin, fait face aux Rangers US à la Pointe du Hoc. Contre-attaque vers Omaha.' },
    '915': { title: '915. Grenadier-Regiment', cmd: 'Oberstleutnant Karl Meyer (†7.6.44)', strength: '~3 000 hommes', sector: 'Réserve — Bayeux', history: 'Formé à partir de la 268. ID. Vétérans de Moscou, Rzhev, Koursk.', composition: ['I. Bataillon', 'II. Bataillon', 'III. Bataillon', '13. Kp. (IG)', '14. Kp. (PaK)'], armament: 'Configuration standard Type 44.', dday: 'Contre-attaque vers Colleville le 6 juin. Meyer tué le 7 juin.' },
    '916': { title: '916. Grenadier-Regiment ★', cmd: 'Oberst Ernst Goth', strength: '~3 200 hommes', sector: 'Omaha Beach (WN60-WN74)', history: 'Vétérans de Stalingrad. 5. Kp., II. Btl — notre unité.', composition: ['I. Btl — Colleville', 'II. Btl — Saint-Laurent ★', 'III. Btl — Vierville', '13. Kp. (IG)', '14. Kp. (PaK)'], armament: '180 MG 42, 36 mortiers 8cm, PaK 40.', dday: 'Défense d\'Omaha Beach le 6 juin à 06h30. ~2 400 victimes US.' },
    'fus': { title: 'Füsilier-Bataillon 352', cmd: 'Commandant inconnu', strength: '~800 hommes', sector: 'Réserve mobile', history: 'Infanterie légère partiellement motorisée.', composition: ['4 Kp. d\'inf. légère'], armament: 'Équipement léger motorisé.', dday: 'Soutien du 915. GR pour contre-attaque.' },
    'art': { title: 'Artillerie-Regiment 352', cmd: 'Obl. Karl-Wilhelm Ocker', strength: '~2 000 hommes', sector: 'Soutien feu', history: 'Artillerie hippomobile.', composition: ['I.-III. Abt (10.5cm)', 'IV. Abt (15cm)'], armament: '36× 10.5cm + 12× 15cm.', dday: 'Feu de barrage sur Omaha.' },
    'pzjg': { title: 'Panzerjäger-Abteilung 352', cmd: 'Commandant inconnu', strength: '~500 hommes', sector: 'Défense antichar', history: 'Chasseurs de chars.', composition: ['1. Kp — 14 StuG III', '2.-3. Kp — PaK 40'], armament: '14 StuG III + PaK 40.', dday: 'Seuls blindés allemands sur Omaha.' },
    'pi': { title: 'Pionier-Bataillon 352', cmd: 'Commandant inconnu', strength: '~600 hommes', sector: 'Fortifications côtières', history: 'Génie. Obstacles de plage.', composition: ['3 Kp. de pionniers', 'Section mines'], armament: 'Mines, explosifs, lance-flammes.', dday: 'Obstacles ralentissent les péniches.' },
    'na': { title: 'Nachrichten-Abteilung 352', cmd: 'Commandant inconnu', strength: '~400 hommes', sector: 'Transmissions', history: 'Communications divisionnaires.', composition: ['1 Kp. téléphone', '1 Kp. radio'], armament: 'Feldfernsprecher, Torn.Fu.b1.', dday: 'Lignes coupées par tirs navals.' },
    'feld': { title: 'Feldgendarmerietrupp 352', cmd: 'Commandant inconnu', strength: '~50 hommes', sector: 'Police militaire', history: 'Discipline, contrôle, prévention désertion.', composition: ['1 section de Feldgendarmerie'], armament: 'MP 40, P08/P38.', dday: 'Ordre à l\'arrière le 6 juin.' },
    'san': { title: 'Sanitätskompanie 352', cmd: 'Médecin-chef', strength: '~200 hommes', sector: 'Service médical', history: 'Évacuation et traitement des blessés.', composition: ['Postes de secours', 'Ambulances', 'Lazarett'], armament: 'Protégé Convention de Genève.', dday: 'Débordé par l\'afflux de blessés.' },
    'verw': { title: 'Verwaltungstruppen 352', cmd: 'Intendant', strength: '~600 hommes', sector: 'Logistique', history: 'Ravitaillement, transport, boulangerie, boucherie.', composition: ['Ravitaillement', 'Boulangerie', 'Transport', 'Atelier'], armament: 'Véhicules, cuisines roulantes.', dday: 'Maintient la logistique sous bombardements.' },
  }

  /* ─── Historical unit popup (kept for composition section) ─── */
  const renderUnitPopup = () => {
    if (!unitDetail || !UNIT_DETAILS[unitDetail]) return null
    const u = UNIT_DETAILS[unitDetail]
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '30px 10px', overflowY: 'auto' }}
        onClick={e => { if (e.target === e.currentTarget) setUnitDetail(null) }}>
        <div className="paper-card" style={{ maxWidth: 700, width: '100%', padding: 'var(--space-xl)', background: '#f5f0e1', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem' }}>{u.title}</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>352. Infanterie-Division</div>
            </div>
            <button className="btn btn-secondary" onClick={() => setUnitDetail(null)} style={{ fontSize: '0.8rem' }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap', marginBottom: 'var(--space-lg)' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Commandant</div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.cmd}</div>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Effectif</div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.strength}</div>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Secteur</div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.sector}</div>
            </div>
          </div>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h4 style={{ margin: '0 0 var(--space-xs)', color: 'var(--military-green)', fontSize: '0.9rem' }}>📖 Historique</h4>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.7, margin: 0 }}>{u.history}</p>
          </div>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h4 style={{ margin: '0 0 var(--space-xs)', color: 'var(--military-green)', fontSize: '0.9rem' }}>🏗️ Composition</h4>
            <ul style={{ fontSize: '0.8rem', lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
              {(Array.isArray(u.composition) ? u.composition : [u.composition]).map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h4 style={{ margin: '0 0 var(--space-xs)', color: 'var(--military-green)', fontSize: '0.9rem' }}>🔫 Armement</h4>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.7, margin: 0 }}>{u.armament}</p>
          </div>
          <div style={{ background: 'rgba(139,0,0,0.06)', borderLeft: '3px solid #8b0000', padding: '10px 14px', borderRadius: 4 }}>
            <h4 style={{ margin: '0 0 var(--space-xs)', color: '#8b0000', fontSize: '0.9rem' }}>⚔️ Jour-J — 6 juin 1944</h4>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.7, margin: 0 }}>{u.dday}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      {renderUnitPopup()}
      {/* En-tête */}
      <div className="paper-card" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', position: 'relative' }}>
        {/* Notification bell */}
        {(notifs.telegrammes > 0 || pending.total > 0) && (
          <div style={{ position: 'absolute', top: 12, right: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            {notifs.telegrammes > 0 && (
              <Link to="/telegrammes" style={{ position: 'relative', textDecoration: 'none', fontSize: '1.4rem', lineHeight: 1 }} title={`${notifs.telegrammes} télégramme${notifs.telegrammes > 1 ? 's' : ''} non lu${notifs.telegrammes > 1 ? 's' : ''}`}>
                ⚡
                <span style={{ position: 'absolute', top: -8, right: -10, background: '#e74c3c', color: 'white', fontSize: '0.6rem', fontWeight: 700, borderRadius: '50%', minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{notifs.telegrammes}</span>
              </Link>
            )}
            {isPrivileged && pending.total > 0 && (
              <Link to="/admin/moderation" style={{ position: 'relative', textDecoration: 'none', fontSize: '1.4rem', lineHeight: 1 }} title={`${pending.total} élément${pending.total > 1 ? 's' : ''} en attente`}>
                🔔
                <span style={{ position: 'absolute', top: -8, right: -10, background: '#e74c3c', color: 'white', fontSize: '0.6rem', fontWeight: 700, borderRadius: '50%', minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{pending.total}</span>
              </Link>
            )}
          </div>
        )}
        <h1 style={{ marginBottom: 'var(--space-xs)' }}>Archives 7e Armeekorps</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          {user?.grade || ''} {user?.username || ''} — {user?.unite || 'Commandement'}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Ce site est dédié à la simulation RP (jeu de rôle) — Aucune affiliation avec des mouvements historiques ou politiques.
        </p>
      </div>

      {/* Validation queue (privileged only) */}
      {isPrivileged && pending.total > 0 && (
        <div className="paper-card" style={{ marginBottom: 'var(--space-xl)', borderLeft: '3px solid var(--warning)' }}>
          <h3 style={{ margin: '0 0 var(--space-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
            🔔 En attente de validation
            <span style={{ background: 'var(--danger)', color: 'white', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>{pending.total}</span>
          </h3>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            {pending.docs > 0 && (
              <Link to="/documentation" className="btn btn-sm btn-secondary">📚 {pending.docs} document{pending.docs > 1 ? 's' : ''} à valider</Link>
            )}
            {pending.permissions > 0 && (
              <Link to="/pds" className="btn btn-sm btn-secondary">🏖️ {pending.permissions} permission{pending.permissions > 1 ? 's' : ''} en attente</Link>
            )}
            {pending.media > 0 && (
              <Link to="/admin/moderation" className="btn btn-sm btn-secondary">📸 {pending.media} média{pending.media > 1 ? 's' : ''} à modérer</Link>
            )}
            {pending.medical > 0 && (
              <Link to="/medical/visites" className="btn btn-sm btn-secondary">🏥 {pending.medical} visite{pending.medical > 1 ? 's' : ''} à valider</Link>
            )}
            {pending.rapports > 0 && (
              <Link to="/rapports" className="btn btn-sm btn-secondary">📝 {pending.rapports} rapport{pending.rapports > 1 ? 's' : ''} à valider</Link>
            )}
          </div>
        </div>
      )}

      {/* Section Lore / Histoire */}
      <div className="paper-card" style={{ marginBottom: 'var(--space-xl)', borderLeft: '3px solid var(--military-green)' }}>
        <details>
        <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ transition: 'transform .2s', display: 'inline-block' }}>▶</span> 📜 Histoire du 916. Grenadier-Regiment
        </summary>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
          Le <strong>916. Grenadier-Regiment</strong> est l'un des trois régiments d'infanterie de la <strong>352. Infanterie-Division</strong>, 
          formée le 14 novembre 1943 à <strong>Saint-Lô, Normandie</strong>, sous le commandement de l'<strong>Oberst Ernst Goth</strong>. 
          La division est rattachée au <strong>LXXXIV. Armeekorps</strong> (General der Artillerie Erich Marcks), 
          lui-même subordonné à la <strong>7. Armee</strong> (Generaloberst Friedrich Dollmann), chargée de la défense de la Normandie et de la Bretagne.
        </p>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
          Les cadres du régiment proviennent principalement des survivants du <strong>Grenadier-Regiment 546</strong> 
          (389. Infanterie-Division), vétérans endurcis du Front de l'Est — notamment de <strong>Stalingrad</strong> et de la 
          <strong> bataille de Koursk</strong>. Les effectifs sont complétés par de jeunes conscrits de la classe 1926, 
          des volontaires Volksdeutsch (Alsaciens, Polonais, Tchèques) et environ 1 500 auxiliaires de l'Est (Hiwis).
        </p>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
          En juin 1944, la division atteint <strong>12 734 hommes</strong>. Le 916. GR tient le secteur est d'<strong>Omaha Beach</strong> 
          lors du <strong>Jour-J (6 juin 1944)</strong>, opposant une résistance féroce aux 16th et 116th Regimental Combat Teams 
          américains (1st et 29th Infantry Divisions). Les positions préparées, mitrailleuses MG 42, mortiers et artillerie 
          infligent des pertes considérables — contribuant aux quelque <strong>2 400 victimes américaines</strong> à Omaha ce jour-là.
        </p>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
          Submergé par les bombardements navals et les renforts, le régiment se replie vers l'intérieur. 
          Les combats acharnés autour de <strong>Saint-Lô</strong> et lors de l'<strong>Opération Cobra</strong> (juillet 1944) 
          entraînent la destruction quasi-totale de la formation. La <strong>Poche de Falaise</strong> (août 1944) 
          achève ce qui reste de la 352. ID.
        </p>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
          Les survivants sont réorganisés en <strong>352. Volksgrenadier-Division</strong> pour participer à 
          l'<strong>Offensive des Ardennes</strong> (Bataille des Bulge, décembre 1944), avant la capitulation finale en 1945.
        </p>
        {/* ─── Organigramme historique IRL ─── */}
        <details style={{ marginTop: 'var(--space-lg)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: 'var(--military-green)' }}>
            📋 Composition historique — 352. Infanterie-Division (IRL)
          </summary>
          <div style={{ marginTop: 'var(--space-md)', overflowX: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              {/* 7. Armee */}
              <div style={{ background: '#1a1a1a', color: '#f5f0e1', padding: '6px 16px', borderRadius: 4, fontWeight: 700, fontSize: '0.75rem', textAlign: 'center' }}>
                7. Armee<br/><span style={{ fontSize: '0.6rem', fontWeight: 400 }}>Generaloberst Friedrich Dollmann</span>
              </div>
              <div style={{ width: 2, height: 10, background: '#555' }}/>
              {/* LXXXIV. AK */}
              <div style={{ background: '#4a3728', color: '#f5f0e1', padding: '6px 16px', borderRadius: 4, fontWeight: 700, fontSize: '0.75rem', textAlign: 'center' }}>
                LXXXIV. Armeekorps<br/><span style={{ fontSize: '0.6rem', fontWeight: 400 }}>General der Artillerie Erich Marcks</span>
              </div>
              <div style={{ width: 2, height: 10, background: '#4b5320' }}/>
              {/* 352. ID */}
              <div style={{ background: '#4b5320', color: '#f5f0e1', padding: '8px 20px', borderRadius: 4, fontWeight: 700, fontSize: '0.8rem', textAlign: 'center', minWidth: 260 }}>
                352. Infanterie-Division<br/><span style={{ fontSize: '0.65rem', fontWeight: 400 }}>Generalleutnant Dietrich Kraiß — ~12 734 hommes</span>
              </div>
              <div style={{ width: 2, height: 12, background: '#4b5320' }}/>
              {/* 3 regiments */}
              <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', justifyContent: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: '16.6%', right: '16.6%', height: 2, background: '#4b5320' }}/>
                {[
                  { id: '914', name: '914. GR', sub: 'Obl. Ernst Heyna', loc: 'Isigny-sur-Mer', color: '#5a6630' },
                  { id: '915', name: '915. GR', sub: 'Obl. Karl Meyer', loc: 'Rés. Bayeux', color: '#5a6630' },
                  { id: '916', name: '916. GR ★', sub: 'Obst. Ernst Goth', loc: 'Omaha Beach', color: '#3a4218' },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 120, cursor: 'pointer' }} onClick={() => setUnitDetail(r.id)}>
                    <div style={{ width: 2, height: 12, background: '#4b5320' }}/>
                    <div style={{ background: r.color, color: '#f5f0e1', padding: '6px 10px', borderRadius: 4, textAlign: 'center', fontSize: '0.7rem', width: '90%', border: r.name.includes('★') ? '2px solid #c9a227' : 'none' }}>
                      <div style={{ fontWeight: 700 }}>{r.name}</div>
                      <div style={{ fontSize: '0.58rem', opacity: 0.8 }}>{r.sub}</div>
                      <div style={{ fontSize: '0.55rem', opacity: 0.7 }}>{r.loc}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Support units */}
              <div style={{ width: 2, height: 10, background: '#4b5320' }}/>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 650 }}>
                {[
                  { id: 'fus', name: 'Füs.Btl 352', icon: '🏃' },
                  { id: 'art', name: 'Art.Rgt 352', icon: '💥' },
                  { id: 'pzjg', name: 'PzJg.Abt 352', icon: '🛡️' },
                  { id: 'pi', name: 'Pi.Btl 352', icon: '⚒️' },
                  { id: 'na', name: 'Na.Abt 352', icon: '📡' },
                  { id: 'feld', name: 'Feldgend.', icon: '🔰' },
                  { id: 'san', name: 'San.Kp', icon: '🏥' },
                  { id: 'verw', name: 'Verw.Tr.', icon: '📦' },
                ].map((u, i) => (
                  <div key={i} style={{ background: 'rgba(75,83,32,0.12)', border: '1px solid rgba(75,83,32,0.3)', borderRadius: 4, padding: '3px 7px', textAlign: 'center', minWidth: 65, fontSize: '0.6rem', cursor: 'pointer' }} onClick={() => setUnitDetail(u.id)}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(75,83,32,0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(75,83,32,0.12)'}>
                    <div>{u.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.62rem' }}>{u.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>

        <details style={{ marginTop: 'var(--space-sm)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: 'var(--military-green)' }}>
            ⚔️ Batailles majeures
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            {[
              { date: '6 juin 1944', name: 'Omaha Beach — Jour-J', result: 'defense', de: '~1 200', al: '~2 400', desc: 'Défense acharnée du secteur est. Retardement de plusieurs heures avant le repli.', resLabel: '⚔️ Défense tactique' },
              { date: 'Juin 1944', name: 'Bataille de Saint-Lô', result: 'defeat', de: '~4 000', al: '~5 000', desc: 'Combats urbains intenses. La ville tombe le 18 juillet après des semaines de résistance.', resLabel: '❌ Défaite stratégique' },
              { date: '25 juil. 1944', name: 'Opération Cobra', result: 'defeat', de: '~5 000+', al: '~1 800', desc: 'Percée américaine massive. Bombardement de saturation. La 352. ID est disloquée.', resLabel: '❌ Percée alliée' },
              { date: 'Août 1944', name: 'Poche de Falaise', result: 'defeat', de: '~10 000 cap.', al: '~1 500', desc: 'Encerclement. Destruction quasi-totale de la division. Quelques survivants s\'échappent.', resLabel: '💀 Destruction' },
              { date: 'Sept. 1944', name: 'Market Garden (Hollande)', result: 'victory', de: '~3 300', al: '~17 200', desc: 'Éléments réorganisés participent à la contre-attaque. Échec de l\'opération alliée.', resLabel: '✅ Victoire défensive' },
              { date: 'Déc. 1944', name: 'Offensive des Ardennes', result: 'defeat', de: '~80 000', al: '~89 000', desc: 'Participation comme 352. VGD. Gains initiaux puis repli devant la contre-offensive.', resLabel: '❌ Échec offensif' },
            ].map((b, i) => {
              const colors = { victory: { bg: 'rgba(75,83,32,0.12)', border: '#4b5320' }, defeat: { bg: 'rgba(139,0,0,0.06)', border: '#8b0000' }, defense: { bg: 'rgba(180,150,50,0.08)', border: '#b49632' } }
              const c = colors[b.result] || colors.defense
              return (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-md)', padding: '10px 12px', background: c.bg, borderLeft: `3px solid ${c.border}`, borderRadius: 4, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 90 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{b.date}</div>
                    <div style={{ fontSize: '0.65rem', color: c.border, fontWeight: 600, marginTop: 2 }}>{b.resLabel}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 2 }}>{b.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{b.desc}</div>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '0.7rem' }}>
                      <span>🇩🇪 Pertes : <strong>{b.de}</strong></span>
                      <span>🇺🇸🇬🇧 Pertes : <strong>{b.al}</strong></span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </details>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 'var(--space-md)', fontStyle: 'italic' }}>
          Sources : 352-inf-div.org, Grokipedia, Lexikon der Wehrmacht. 
          Notre serveur RP portraie la 5. Kompanie, II. Bataillon du 916. Grenadier-Regiment.
        </p>
        </details>
      </div>

      {/* Effectifs par unité */}
      {stats.parUnite && stats.parUnite.length > 0 && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>Effectifs par unité</h2>
          <div className="paper-card">
            {stats.parUnite.map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-xs) 0', borderBottom: i < stats.parUnite.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                <span className="unit-dot" style={{ background: u.couleur || 'var(--military-green)' }}></span>
                <span style={{ flex: 1, fontSize: '0.85rem' }}>{u.code}. {u.nom}</span>
                <strong style={{ fontSize: '0.85rem' }}>{u.count}</strong>
                <div style={{ width: '120px', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (u.count / Math.max(1, stats.effectifs)) * 100)}%`, height: '100%', background: u.couleur || 'var(--military-green)', borderRadius: '4px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="grid grid-cols-3" style={{ gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        {navCards.map((card, i) => (
          <Link to={card.to} key={i} className="paper-card unit-card" style={{ textAlign: 'center', textDecoration: 'none' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>{card.icon}</div>
            <h3 style={{ margin: '0 0 var(--space-xs)' }}>{card.title}</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{card.desc}</p>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-md)' }}>
        <p style={{ margin: '0 0 4px' }}>
          Ce site est dédié exclusivement à la simulation RP (jeu de rôle) sur Garry's Mod — Serveur « Axe | LaBaguetteRP »
        </p>
        <p style={{ margin: '0 0 4px' }}>Accès réservé aux personnels autorisés</p>
        <p style={{ margin: '0 0 8px', fontSize: '0.7rem' }}>
          Développement & modération : <strong>thomaslewis5395</strong> (Discord)
        </p>
        <p style={{ margin: 0, fontSize: '0.65rem', fontStyle: 'italic' }}>
          Les données collectées (pseudonymes Discord, données RP fictives) sont utilisées uniquement dans le cadre du jeu de rôle.
          Aucune donnée personnelle réelle n'est traitée. Contact : thomaslewis5395 sur Discord.
        </p>
      </div>
    </div>
  )
}
