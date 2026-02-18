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
            {[{l:'Commandant',v:u.cmd},{l:'Effectif',v:u.strength},{l:'Secteur',v:u.sector}].map((x,i) => (
              <div key={i} style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{x.l}</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{x.v}</div>
              </div>
            ))}
          </div>
          {[{t:'📖 Historique',c:<p style={{fontSize:'0.82rem',lineHeight:1.7,margin:0}}>{u.history}</p>},
            {t:'🏗️ Composition',c:<ul style={{fontSize:'0.8rem',lineHeight:1.7,margin:0,paddingLeft:18}}>{(Array.isArray(u.composition)?u.composition:[u.composition]).map((c,i)=><li key={i}>{c}</li>)}</ul>},
            {t:'🔫 Armement',c:<p style={{fontSize:'0.82rem',lineHeight:1.7,margin:0}}>{u.armament}</p>},
            {t:'⚔️ Jour-J — 6 juin 1944',c:<p style={{fontSize:'0.82rem',lineHeight:1.7,margin:0}}>{u.dday}</p>}
          ].map((s,i) => (
            <div key={i} style={{ marginBottom: 'var(--space-md)', ...(i===3?{background:'rgba(139,0,0,0.06)',borderLeft:'3px solid #8b0000',padding:'10px 14px',borderRadius:4}:{}) }}>
              <h4 style={{ margin: '0 0 var(--space-xs)', color: i===3?'#8b0000':'var(--military-green)', fontSize: '0.9rem' }}>{s.t}</h4>
              {s.c}
            </div>
          ))}
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (user?.isGuest) return
    apiClient.get('/stats').then(r => setStats(s => ({ ...s, ...r.data }))).catch(() => {})
    if (isPrivileged) {
      apiClient.get('/stats/pending').then(r => setPending(r.data)).catch(() => {})
    }
    // Notifications
    if (user?.effectif_id) {
      apiClient.get('/telegrammes', { params: { tab: 'recu' } }).then(r => {
        const unread = r.data.unread || 0
        setNotifs(n => ({ ...n, telegrammes: unread, total: unread + (isPrivileged ? (pending?.total || 0) : 0) }))
      }).catch(() => {})
    }
  }, [])

  // Update total notifs when pending changes
  useEffect(() => {
    setNotifs(n => ({ ...n, total: n.telegrammes + (isPrivileged ? pending.total : 0) }))
  }, [pending.total])

  const navCards = [
    { icon: '📋', title: 'Effectifs', desc: 'Fiches & soldbücher', to: '/effectifs' },
    { icon: '📝', title: 'Rapports', desc: 'Rapports officiels', to: '/rapports' },
    { icon: '⏱️', title: 'PDS', desc: 'Prise De Service', to: '/pds' },
    { icon: '🚫', title: 'Interdits de front', desc: 'Sanctions & restrictions', to: '/interdits' },
    { icon: '🏥', title: 'Médical', desc: 'Visites médicales', to: '/medical' },
    { icon: '📁', title: 'Dossiers', desc: 'Dossiers & enquêtes', to: '/dossiers' },
    { icon: '⚖️', title: 'Justice Militaire', desc: 'Affaires, enquêtes & tribunal', to: '/sanctions' },
    { icon: '⚡', title: 'Télégrammes', desc: 'Messages entre unités', to: '/telegrammes' },
    { icon: '📚', title: 'Documentation', desc: 'Liens & règlements', to: '/documentation' },
    { icon: '📜', title: 'Archives', desc: 'Historique & logs RP', to: '/archives' },
    { icon: '📚', title: 'Bibliothèque', desc: 'Tampons & signatures', to: '/bibliotheque' },
    { icon: '🔎', title: 'Recherche', desc: 'Recherche globale', to: '/search' },
    { icon: '📅', title: 'Calendrier', desc: 'Événements RP', to: '/calendrier' },
    { icon: '📜', title: 'Ordres', desc: 'Ordres & directives', to: '/ordres' },
    { icon: '📸', title: 'Galerie', desc: 'Photos RP', to: '/galerie' },
    { icon: '🗺️', title: 'Organigramme', desc: 'Organisation du Korps', to: '/organigramme' },
    { icon: '📰', title: 'Journal', desc: 'Wacht am Korps', to: '/journal' },
  ]

  if (user?.isAdmin || user?.isOfficier) {
    navCards.push({ icon: '🎖️', title: 'Commandement', desc: 'Poste de commandement', to: '/commandement' })
  }
  if (user?.isAdmin || user?.isOfficier || user?.isRecenseur) {
    navCards.push({ icon: '👔', title: 'Habillement', desc: 'Demandes d\'habillement', to: '/habillement' })
  }

  if (user?.isAdmin || user?.isOfficier || user?.isRecenseur) {
    navCards.push({ icon: '🔔', title: 'Validation', desc: 'Modération & validation', to: '/admin/moderation' })
  }
  if (user?.isAdmin || user?.isOfficier || user?.isRecenseur) {
    navCards.push({ icon: '📊', title: 'Statistiques', desc: 'Vue d\'ensemble', to: '/admin/stats' })
  }
  if (user?.isAdmin) {
    navCards.push({ icon: '⚙️', title: 'Administration', desc: 'Utilisateurs & permissions', to: '/admin/users' })
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

      {/* Histoire de la 352. Infanterie-Division */}
      <div className="paper-card" style={{ marginBottom: 'var(--space-xl)' }}>
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', textAlign: 'center', listStyle: 'none' }}>
            📜 Histoire — 352. Infanterie-Division
          </summary>
          <p style={{ fontSize: '0.82rem', lineHeight: 1.7, marginTop: 'var(--space-md)' }}>
            La <strong>352. Infanterie-Division</strong> est formée le <strong>5 novembre 1943</strong> à Saint-Lô (Normandie), sous le commandement du <strong>Generalleutnant Dietrich Kraiss</strong>. Elle intègre des vétérans du Front de l'Est (321. et 268. ID) et des recrues de 17-18 ans.
            Affectée au <strong>LXXXIV. Armeekorps</strong> (7. Armee), elle défend le secteur Bayeux–Isigny, incluant <strong>Omaha Beach</strong>.
          </p>
          <p style={{ fontSize: '0.82rem', lineHeight: 1.7 }}>
            Le <strong>6 juin 1944</strong>, le 916. Grenadier-Regiment inflige ~2 400 pertes aux Américains à Omaha Beach. La division est progressivement détruite lors de la bataille de Normandie et encerclée dans la <strong>poche de Falaise</strong> (août 1944). Reconstituée comme <strong>352. Volksgrenadier-Division</strong>, elle participe à l'offensive des Ardennes avant de se rendre en avril 1945.
          </p>

        <details style={{ marginTop: 'var(--space-sm)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: 'var(--military-green)' }}>
            🏛️ Organigramme historique IRL
          </summary>
          <div style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', padding: '8px 20px', background: 'rgba(75,83,32,0.15)', border: '2px solid var(--military-green)', borderRadius: 6, fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>7. Armee — GFM Erwin Rommel</div>
            <div style={{ fontSize: '1.2rem' }}>↓</div>
            <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(75,83,32,0.1)', border: '1.5px solid var(--military-green)', borderRadius: 5, fontWeight: 600, fontSize: '0.82rem', marginBottom: 8 }}>LXXXIV. Armeekorps — Gen. Erich Marcks (†12.6.44)</div>
            <div style={{ fontSize: '1.2rem' }}>↓</div>
            <div style={{ display: 'inline-block', padding: '8px 20px', background: 'rgba(139,0,0,0.08)', border: '2px solid #8b0000', borderRadius: 6, fontWeight: 700, fontSize: '0.95rem', color: '#8b0000', marginBottom: 12 }}>352. Infanterie-Division — GenLt. Dietrich Kraiss (†6.8.44)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              {[
                { id: '914', name: '914. GR', icon: '⚔️' },{ id: '915', name: '915. GR', icon: '⚔️' },{ id: '916', name: '916. GR ★', icon: '⭐' },
                { id: 'fus', name: 'Füs.Btl 352', icon: '🏃' },{ id: 'art', name: 'Art.Rgt 352', icon: '💥' },{ id: 'pzjg', name: 'PzJg.Abt 352', icon: '🛡️' },
                { id: 'pi', name: 'Pi.Btl 352', icon: '⚒️' },{ id: 'na', name: 'Na.Abt 352', icon: '📡' },{ id: 'feld', name: 'Feldgend.', icon: '🔰' },
                { id: 'san', name: 'San.Kp', icon: '🏥' },{ id: 'verw', name: 'Verw.Tr.', icon: '📦' },
              ].map((r, i) => (
                <div key={i} style={{ background: 'rgba(75,83,32,0.12)', border: '1px solid rgba(75,83,32,0.3)', borderRadius: 4, padding: '3px 7px', textAlign: 'center', minWidth: 65, fontSize: '0.6rem', cursor: 'pointer' }}
                  onClick={() => setUnitDetail(r.id)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(75,83,32,0.25)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(75,83,32,0.12)'}>
                  <div>{r.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.62rem' }}>{r.name}</div>
                </div>
              ))}
            </div>
          </div>
        </details>

        <details style={{ marginTop: 'var(--space-sm)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: 'var(--military-green)' }}>
            ⚔️ Batailles majeures
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            {[
              { date: '6 juin 1944', name: 'Omaha Beach — Jour-J', de: '~1 200', al: '~2 400', desc: 'Défense acharnée du secteur est.', res: '⚔️ Défense tactique' },
              { date: 'Juin 1944', name: 'Bataille de Saint-Lô', de: '~4 000', al: '~5 000', desc: 'Combats urbains intenses. La ville tombe le 18 juillet.', res: '❌ Défaite stratégique' },
              { date: '25 juil. 1944', name: 'Opération Cobra', de: '~5 000+', al: '~1 800', desc: 'Percée américaine massive. La 352. ID est disloquée.', res: '❌ Percée alliée' },
              { date: 'Août 1944', name: 'Poche de Falaise', de: '~10 000 cap.', al: '~1 500', desc: 'Encerclement et destruction quasi-totale.', res: '💀 Destruction' },
              { date: 'Sept. 1944', name: 'Market Garden', de: '~3 300', al: '~17 200', desc: 'Éléments réorganisés participent à la contre-attaque.', res: '✅ Victoire défensive' },
              { date: 'Déc. 1944', name: 'Offensive des Ardennes', de: '~80 000', al: '~89 000', desc: 'Participation comme 352. VGD. Gains puis repli.', res: '❌ Échec offensif' },
            ].map((b, i) => (
              <div key={i} style={{ background: 'rgba(75,83,32,0.04)', border: '1px solid rgba(75,83,32,0.15)', borderRadius: 4, padding: '8px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.82rem' }}>{b.name}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{b.date}</span>
                </div>
                <p style={{ margin: '0 0 4px', fontSize: '0.78rem', lineHeight: 1.5 }}>{b.desc}</p>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem' }}>
                  <span>🇩🇪 {b.de}</span><span>🇺🇸 {b.al}</span><span style={{ marginLeft: 'auto', fontWeight: 600 }}>{b.res}</span>
                </div>
              </div>
            ))}
          </div>
        </details>
        </details>
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
              <Link to="/medical" className="btn btn-sm btn-secondary">🏥 {pending.medical} visite{pending.medical > 1 ? 's' : ''} à valider</Link>
            )}
            {pending.rapports > 0 && (
              <Link to="/rapports" className="btn btn-sm btn-secondary">📝 {pending.rapports} rapport{pending.rapports > 1 ? 's' : ''} à valider</Link>
            )}
          </div>
        </div>
      )}

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
