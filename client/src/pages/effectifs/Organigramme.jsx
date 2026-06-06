import React, { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import BackButton from '../../components/BackButton'
import { exportToPdf, exportToImage } from '../../utils/exportPdf'

/* ─── Couleurs par unité ─── */
const UNIT_COLORS = {
  '916': { bg: '#4b5320', dot: '⚪', label: '916. Grenadier-Regiment' },
  '254': { bg: '#c97000', dot: '🟠', label: '254. Feldgendarmerie' },
  '003': { bg: '#2c5ea0', dot: '🔵', label: '3. Fallschirm-Sanitäts-Abteilung' },
  '352': { bg: '#3b4022', dot: '🟤', label: '352. Pionier-Bataillon' },
  '130': { bg: '#6b2d8b', dot: '🟣', label: '130. Panzer Lehr' },
  '009': { bg: '#b8a000', dot: '🟡', label: '009. Fallschirmjager-Regiment' },
}

/* ─── Grades par régiment ─── */
const GRADES = {
  '916': [
    { nom: 'Schutze', abbr: 'Schtz.', cat: 'HDR', role: 'Soldat de base, fantassin' },
    { nom: 'Oberschütze', abbr: 'OSchtz.', cat: 'HDR', role: 'Soldat confirmé' },
    { nom: 'Gefreiter', abbr: 'Gefr.', cat: 'HDR', role: 'Caporal, chef de binôme' },
    { nom: 'Obergefreiter', abbr: 'OGefr.', cat: 'HDR', role: 'Caporal-chef' },
    { nom: 'Stabsgefreiter', abbr: 'StGefr.', cat: 'HDR', role: 'Caporal-chef supérieur' },
    { nom: 'Unteroffizier', abbr: 'Uffz.', cat: 'SO', role: 'Premier sous-officier, chef de groupe' },
    { nom: 'Unterfeldwebel', abbr: 'UFw.', cat: 'SO', role: 'Adjoint au chef de section' },
    { nom: 'Feldwebel', abbr: 'Fw.', cat: 'SO', role: 'Chef de section' },
    { nom: 'Oberfeldwebel', abbr: 'OFw.', cat: 'SO', role: 'Adjudant-chef, bras droit du Hauptmann' },
    { nom: 'Stabsfeldwebel', abbr: 'StFw.', cat: 'SO', role: 'Adjudant de compagnie' },
    { nom: 'Leutnant', abbr: 'Lt.', cat: 'OFF', role: 'Chef de section (officier)' },
    { nom: 'Oberleutnant', abbr: 'OLt.', cat: 'OFF', role: 'Chef de compagnie adjoint' },
    { nom: 'Hauptmann', abbr: 'Hptm.', cat: 'OFF', role: 'Chef de compagnie' },
    { nom: 'Major', abbr: 'Maj.', cat: 'OFF', role: 'Chef de bataillon' },
    { nom: 'Oberstleutnant', abbr: 'OTL.', cat: 'OFF', role: 'Commandant adjoint du régiment' },
    { nom: 'Oberst', abbr: 'Obst.', cat: 'OFF', role: 'Commandant du régiment' },
    { nom: 'Generalmajor', abbr: 'GenMaj.', cat: 'OFF', role: 'Général de brigade' },
    { nom: 'Generalleutnant', abbr: 'GenLt.', cat: 'OFF', role: 'Général de division' },
    { nom: 'General der Infanterie', abbr: 'Gen.d.Inf.', cat: 'OFF', role: 'Général de corps d\'armée' },
    { nom: 'Generaloberst', abbr: 'GenObst.', cat: 'OFF', role: 'Colonel-général' },
    { nom: 'Generalfeldmarschall', abbr: 'GFM.', cat: 'OFF', role: 'Maréchal' },
  ],
  '254': [
    { nom: 'Feldgendarme', abbr: 'FGd.', cat: 'HDR', role: 'Gendarme de base' },
    { nom: 'Oberfeldgendarme', abbr: 'OFGd.', cat: 'HDR', role: 'Gendarme confirmé' },
    { nom: 'Gefreiter', abbr: 'Gefr.', cat: 'HDR', role: 'Caporal' },
    { nom: 'Obergefreiter', abbr: 'OGefr.', cat: 'HDR', role: 'Caporal-chef' },
    { nom: 'Stabsgefreiter', abbr: 'StGefr.', cat: 'HDR', role: 'Caporal-chef supérieur' },
    { nom: 'Unteroffizier', abbr: 'Uffz.', cat: 'SO', role: 'Chef de groupe' },
    { nom: 'Unterfeldwebel', abbr: 'UFw.', cat: 'SO', role: 'Adjoint chef de section' },
    { nom: 'Feldwebel', abbr: 'Fw.', cat: 'SO', role: 'Chef de section' },
    { nom: 'Oberfeldwebel', abbr: 'OFw.', cat: 'SO', role: 'Adjudant-chef' },
    { nom: 'Stabsfeldwebel', abbr: 'StFw.', cat: 'SO', role: 'Adjudant de compagnie' },
    { nom: 'Leutnant', abbr: 'Lt.', cat: 'OFF', role: 'Chef de section (officier)' },
    { nom: 'Oberleutnant', abbr: 'OLt.', cat: 'OFF', role: 'Chef de compagnie adjoint' },
    { nom: 'Hauptmann', abbr: 'Hptm.', cat: 'OFF', role: 'Chef de compagnie' },
    { nom: 'Major', abbr: 'Maj.', cat: 'OFF', role: 'Chef de bataillon' },
    { nom: 'Oberstleutnant', abbr: 'OTL.', cat: 'OFF', role: 'Commandant adjoint' },
    { nom: 'Oberst', abbr: 'Obst.', cat: 'OFF', role: 'Commandant' },
  ],
  '003': [
    { nom: 'Sanitatssoldat', abbr: 'SanSdt.', cat: 'HDR', role: 'Infirmier de base' },
    { nom: 'Sanitats Obersoldat', abbr: 'SanOSdt.', cat: 'HDR', role: 'Infirmier confirmé' },
    { nom: 'Gefreiter', abbr: 'Gefr.', cat: 'HDR', role: 'Caporal médical' },
    { nom: 'Obergefreiter', abbr: 'OGefr.', cat: 'HDR', role: 'Caporal-chef médical' },
    { nom: 'Unteroffizier', abbr: 'Uffz.', cat: 'SO', role: 'Sous-officier médical' },
    { nom: 'Unterfeldwebel', abbr: 'UFw.', cat: 'SO', role: 'Adjoint chef de section médicale' },
    { nom: 'Feldwebel', abbr: 'Fw.', cat: 'SO', role: 'Chef de section médicale' },
    { nom: 'Oberfeldwebel', abbr: 'OFw.', cat: 'SO', role: 'Adjudant-chef médical' },
    { nom: 'Unterarzt', abbr: 'UArzt', cat: 'OFF', role: 'Aspirant médecin' },
    { nom: 'Assistenzarzt', abbr: 'AssArzt', cat: 'OFF', role: 'Médecin assistant' },
    { nom: 'Oberarzt', abbr: 'OArzt', cat: 'OFF', role: 'Médecin-chef adjoint' },
    { nom: 'Stabsarzt', abbr: 'StArzt', cat: 'OFF', role: 'Médecin-chef' },
    { nom: 'Oberstabsarzt', abbr: 'OStArzt', cat: 'OFF', role: 'Médecin-chef de régiment' },
    { nom: 'Oberfeldarzt', abbr: 'OFArzt', cat: 'OFF', role: 'Médecin-chef divisionnaire' },
    { nom: 'Oberstarzt', abbr: 'OStArzt', cat: 'OFF', role: 'Médecin-chef supérieur' },
  ],
  '352': [
    { nom: 'Schutze', abbr: 'Sch.', cat: 'HDR', role: 'Pionnier de base' },
    { nom: 'Oberschutze', abbr: 'OSch.', cat: 'HDR', role: 'Pionnier confirme' },
    { nom: 'Gefreiter', abbr: 'Gefr.', cat: 'HDR', role: 'Caporal' },
    { nom: 'Obergefreiter', abbr: 'OGefr.', cat: 'HDR', role: 'Caporal-chef' },
    { nom: 'Stabsgefreiter', abbr: 'StGefr.', cat: 'SO', role: 'Caporal-chef superieur' },
    { nom: 'Unteroffizier', abbr: 'Uffz.', cat: 'SO', role: 'Sous-officier' },
    { nom: 'Unterfeldwebel', abbr: 'UFw.', cat: 'SO', role: 'Sous-officier subalterne' },
    { nom: 'Feldwebel', abbr: 'Fw.', cat: 'SO', role: 'Chef de section du genie' },
    { nom: 'Oberfeldwebel', abbr: 'OFw.', cat: 'SO', role: 'Adjudant de compagnie' },
    { nom: 'Stabsfeldwebel', abbr: 'StFw.', cat: 'SO', role: 'Adjudant-chef' },
    { nom: 'Leutnant', abbr: 'Lt.', cat: 'OFF', role: 'Officier du genie' },
    { nom: 'Oberleutnant', abbr: 'OLt.', cat: 'OFF', role: 'Chef de bataillon' },
    { nom: 'Hauptmann', abbr: 'Hptm.', cat: 'OFF', role: 'Capitaine' },
    { nom: 'Major', abbr: 'Maj.', cat: 'OFF', role: 'Commandant' },
    { nom: 'Oberstleutnant', abbr: 'OTL.', cat: 'OFF', role: 'Commandant adjoint' },
    { nom: 'Oberst', abbr: 'Obst.', cat: 'OFF', role: 'Commandant superieur' },
  ],
  '130': [
    { nom: 'Schutze', abbr: 'Schtz.', cat: 'HDR', role: 'Recrue blindée' },
    { nom: 'Oberschütze', abbr: 'OSchtz.', cat: 'HDR', role: 'Soldat confirmé' },
    { nom: 'Gefreiter', abbr: 'Gefr.', cat: 'HDR', role: 'Caporal blindé' },
    { nom: 'Obergefreiter', abbr: 'OGefr.', cat: 'HDR', role: 'Caporal-chef' },
    { nom: 'Stabsgefreiter', abbr: 'StGefr.', cat: 'HDR', role: 'Caporal-chef supérieur' },
    { nom: 'Unteroffizier', abbr: 'Uffz.', cat: 'SO', role: 'Chef de char' },
    { nom: 'Unterfeldwebel', abbr: 'UFw.', cat: 'SO', role: 'Adjoint chef de section blindée' },
    { nom: 'Feldwebel', abbr: 'Fw.', cat: 'SO', role: 'Chef de section blindée' },
    { nom: 'Oberfeldwebel', abbr: 'OFw.', cat: 'SO', role: 'Adjudant-chef blindé' },
    { nom: 'Stabsfeldwebel', abbr: 'StFw.', cat: 'SO', role: 'Adjudant de compagnie' },
    { nom: 'Leutnant', abbr: 'Lt.', cat: 'OFF', role: 'Chef de peloton (officier)' },
    { nom: 'Oberleutnant', abbr: 'OLt.', cat: 'OFF', role: 'Chef de compagnie adjoint' },
    { nom: 'Hauptmann', abbr: 'Hptm.', cat: 'OFF', role: 'Chef de compagnie' },
    { nom: 'Major', abbr: 'Maj.', cat: 'OFF', role: 'Chef de bataillon' },
    { nom: 'Oberstleutnant', abbr: 'OTL.', cat: 'OFF', role: 'Commandant adjoint' },
    { nom: 'Oberst', abbr: 'Obst.', cat: 'OFF', role: 'Commandant' },
  ],
  '009': [
    { nom: 'Fallschirmjager', abbr: 'FsJg.', cat: 'HDR', role: 'Parachutiste de base' },
    { nom: 'Oberflieger', abbr: 'OFlg.', cat: 'HDR', role: 'Parachutiste confirmé' },
    { nom: 'Gefreiter', abbr: 'Gefr.', cat: 'HDR', role: 'Caporal parachutiste' },
    { nom: 'Obergefreiter', abbr: 'OGefr.', cat: 'HDR', role: 'Caporal-chef' },
    { nom: 'Stabsgefreiter', abbr: 'StGefr.', cat: 'HDR', role: 'Caporal-chef supérieur' },
    { nom: 'Unteroffizier', abbr: 'Uffz.', cat: 'SO', role: 'Chef de groupe parachutiste' },
    { nom: 'Unterfeldwebel', abbr: 'UFw.', cat: 'SO', role: 'Adjoint chef de section' },
    { nom: 'Feldwebel', abbr: 'Fw.', cat: 'SO', role: 'Chef de section' },
    { nom: 'Oberfeldwebel', abbr: 'OFw.', cat: 'SO', role: 'Adjudant-chef' },
    { nom: 'Stabsfeldwebel', abbr: 'StFw.', cat: 'SO', role: 'Adjudant de compagnie' },
    { nom: 'Leutnant', abbr: 'Lt.', cat: 'OFF', role: 'Chef de section (officier)' },
    { nom: 'Oberleutnant', abbr: 'OLt.', cat: 'OFF', role: 'Chef adjoint' },
    { nom: 'Hauptmann', abbr: 'Hptm.', cat: 'OFF', role: 'Chef de compagnie' },
    { nom: 'Major', abbr: 'Maj.', cat: 'OFF', role: 'Chef de bataillon' },
    { nom: 'Oberstleutnant', abbr: 'OTL.', cat: 'OFF', role: 'Commandant adjoint' },
    { nom: 'Oberst', abbr: 'Obst.', cat: 'OFF', role: 'Commandant' },
  ],
}

/* ─── Spécialités du 916 (règlement serveur) ─── */
const SPECIALTIES = {
  'grenadier': {
    name: 'Grenadier / PanzerGrenadier', icon: '💣',
    desc: 'Fantassin équipé de grenades et lance-grenades. Spécialiste des assauts rapprochés.',
    rules: ['Maximum 5 grenades, ravitaillement via QTM ou retour base', 'Interdit d\'utiliser les lance-grenades dans les bâtiments', 'Tir de l\'extérieur vers l\'intérieur autorisé']
  },
  'mg': {
    name: 'Maschinengewehr / MG', icon: '🔫',
    desc: 'Tireur de mitrailleuse lourde. Appui feu et suppression.',
    rules: ['Salves de 5s toutes les 3s', 'Tir debout/accroupi uniquement avec support']
  },
  'sniper': {
    name: 'Scharfschütze / Sniper', icon: '🎯',
    desc: 'Tireur d\'élite. Reconnaissance et élimination de cibles prioritaires.',
    rules: ['Cibles prioritaires : SO, Officiers, SS, FSM, 101st, 15th, Sniper, Tankiste, Canonnier, Funker, Artilleur', 'Interdit de rentrer sur un point de capture sans régulière', 'Peut être accompagné d\'un spoteur (29th ou 916.)', 'Reconnaissance max 1 AP à l\'avance', 'Call radio obligatoire avant d\'abattre une cible prioritaire']
  },
  'artilleur': {
    name: 'Artilleur / Artillerist', icon: '💥',
    desc: 'Opérateur de canon d\'artillerie 105mm. Frappes indirectes à longue portée.',
    rules: ['Canon 105mm uniquement, mode artillerie uniquement', '1 salve toutes les 5 min', 'Munitions WP interdites', 'Interdit en attaque/défense de base', 'Peut quitter la base seul']
  },
  'canonnier': {
    name: 'Canonnier / Kanoneer', icon: '🎯',
    desc: 'Opérateur de canon 50mm. Tir direct uniquement.',
    rules: ['Canon 50mm (75mm si ennemi P3/P4)', 'Tir direct uniquement', '1 tir HE toutes les 40s']
  },
  'panzerjager': {
    name: 'PanzerJäger / Anti-Tank', icon: '🛡️',
    desc: 'Chasseur de chars équipé de Panzerfaust.',
    rules: ['Tir uniquement sur véhicules', 'Hors AP/VP : 2 accompagnants minimum', 'Max 4 roquettes', 'Tir accroupi, extérieur uniquement', '1 tir / 15s', 'Grenade AT collante interdite contre infanterie']
  },
  'sapeur': {
    name: 'Sapeur / Pionnier', icon: '⚒️',
    desc: 'Ingénieur militaire. Mines et fortifications avancées.',
    rules: ['Max 4 mines, extérieur uniquement', 'Panneau "miné" visible obligatoire', 'Fortif. extérieures illimitées', 'Aucun accès bloqué', 'Mines hors service avant changement de job', 'Max ~30m de l\'AP']
  },
  'flammerwerfer': {
    name: 'Flammenwerfer / Flamethrower', icon: '🔥',
    desc: 'Lance-flammes. Nettoyage de positions.',
    rules: ['Giclée 3s / 5s', 'Interdit en intérieur', 'Ext. vers int. autorisé']
  },
  'funker': {
    name: 'Funker / Radioman', icon: '📡',
    desc: 'Opérateur radio. Transmissions entre unités.',
    rules: ['Balayage radio interdit', 'Peut créer un poste radio (nommé)', 'Poste installé = radio textuelle pour les proches']
  },
  'qtm': {
    name: 'QTM / Kraftfahrer', icon: '🚛',
    desc: 'Quartier-maître. Ravitaillement et transport.',
    rules: ['Peut quitter la base seul', 'Poste de réparation avancé 1 AP avant (crédible)', 'Réparation : min 1 minute sur place']
  },
}

/* ─── Commandants RP par défaut ─── */
const DEFAULT_COMMANDERS = {
  '7ak': { kommandeur: 'Maréchal Jean Devin' },
  '84ak': { kommandeur: 'Maréchal Jean Devin (intérim)', generalstab: 'Maréchal Jean Devin' },
  '916': { kommandeur: 'OLtn. Manfred Wurst', adjoint: 'Ltn. Miller Hermantraut' },
  '254': { kommandeur: 'Hptm. Jean Muller', adjoint: 'OLtn. Kreger Hoenstadt' },
  '003': { kommandeur: 'OStArzt Ernest Der Erlkönig', adjoint: 'OArzt Bert Elséeune' },
  '352': { kommandeur: 'OLtn. Krauss Von Strauss', adjoint: 'StFw. Ludwig Weber' },
  '130': { kommandeur: 'Maj. Ernst Honigsberg', adjoint: 'Ltn. Ernst von Richtofen' },
  '009': { kommandeur: 'Hptm. Markus Urkane', adjoint: '' },
}

export default function Organigramme() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [gradePopup, setGradePopup] = useState(null)
  const [spePopup, setSpePopup] = useState(null)
  const [editPopup, setEditPopup] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [msg, setMsg] = useState('')

  const canEdit = user?.isAdmin || user?.isEtatMajor || user?.isOfficier || user?.isRecenseur

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await api.get('/organigramme/layout')
      const raw = res.data?.data?.layout || res.data?.layout || '{}'
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      // Merge defaults for any missing commanders
      const merged = { ...parsed }
      Object.entries(DEFAULT_COMMANDERS).forEach(([key, vals]) => {
        if (!merged[key]) merged[key] = {}
        Object.entries(vals).forEach(([f, v]) => {
          if (!merged[key][f]) merged[key][f] = v
        })
      })
      setData(merged)
    } catch { setData({ ...DEFAULT_COMMANDERS }) }
  }

  const saveData = async (newData) => {
    setData(newData)
    try { await api.put('/organigramme/layout', { layout: JSON.stringify(newData) }) } catch {}
  }

  const getField = (key, field) => data?.[key]?.[field] || ''

  const openEdit = (key, field, label) => {
    setEditPopup({ key, field, label })
    setEditVal(getField(key, field))
  }

  const saveEdit = () => {
    if (!editPopup) return
    const d = { ...data }
    if (!d[editPopup.key]) d[editPopup.key] = {}
    d[editPopup.key][editPopup.field] = editVal
    saveData(d)
    setEditPopup(null)
    setMsg('✓ Mis à jour')
    setTimeout(() => setMsg(''), 2000)
  }

  const CmdText = ({ unitKey, field, placeholder }) => {
    const val = getField(unitKey, field)
    if (!canEdit) return <span style={{ fontSize: '0.7rem' }}>{val || <i style={{ opacity: 0.5 }}>{placeholder || '—'}</i>}</span>
    return <span style={{ fontSize: '0.7rem', cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,0.3)' }}
      onClick={e => { e.stopPropagation(); openEdit(unitKey, field, `${UNIT_COLORS[unitKey]?.label || unitKey} — ${field}`) }}>
      {val || <i style={{ opacity: 0.5 }}>{placeholder || '✏️'}</i>}
    </span>
  }

  const catColors = { HDR: '#5a6630', SO: '#b49632', OFF: '#8b0000' }
  const catLabels = { HDR: 'Homme du rang', SO: 'Sous-officier', OFF: 'Officier' }

  if (!data) return <div className="container"><p>Chargement...</p></div>

  return (
    <div className="container" id="organigramme-content">
      <BackButton label="← Tableau de bord" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 'var(--space-lg) 0 var(--space-sm)' }}>🏛️ Organigramme du 7. Armeekorps</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-small" onClick={() => exportToPdf('organigramme-content', 'Organigramme_7AK')}>📄 PDF</button>
          <button className="btn btn-secondary btn-small" onClick={() => exportToImage('organigramme-content', 'Organigramme_7AK')}>🖼️ Image</button>
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 var(--space-lg)' }}>Cliquer sur un régiment pour voir ses grades • Cliquer sur une spécialité pour voir les règles</p>
      {msg && <div className="alert alert-success" style={{ marginBottom: 'var(--space-md)' }}>{msg}</div>}

      {/* ─── Edit popup ─── */}
      {editPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1001, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setEditPopup(null) }}>
          <div className="paper-card" style={{ maxWidth: 400, width: '100%', padding: 'var(--space-lg)', background: '#f5f0e1' }}>
            <h3 style={{ marginTop: 0 }}>✏️ {editPopup.label}</h3>
            <input type="text" className="form-input" value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') saveEdit() }} />
            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-sm)' }}>
              <button className="btn btn-secondary" onClick={() => setEditPopup(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={saveEdit}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Grade popup ─── */}
      {gradePopup && GRADES[gradePopup] && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '30px 10px', overflowY: 'auto' }}
          onClick={e => { if (e.target === e.currentTarget) setGradePopup(null) }}>
          <div className="paper-card" style={{ maxWidth: 700, width: '100%', padding: 'var(--space-xl)', background: '#f5f0e1', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>{UNIT_COLORS[gradePopup]?.dot} {UNIT_COLORS[gradePopup]?.label}</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Kommandeur : {getField(gradePopup, 'kommandeur') || '—'}
                  {getField(gradePopup, 'adjoint') && <> • Adjoint : {getField(gradePopup, 'adjoint')}</>}
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => setGradePopup(null)}>✕</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${UNIT_COLORS[gradePopup]?.bg || '#555'}` }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Grade</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Abrév.</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px' }}>Catégorie</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Rôle / Utilité</th>
                </tr>
              </thead>
              <tbody>
                {GRADES[gradePopup].map((g, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', background: i % 2 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 600 }}>{g.nom}</td>
                    <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontSize: '0.75rem' }}>{g.abbr}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                      <span style={{ background: catColors[g.cat], color: '#fff', fontSize: '0.6rem', padding: '2px 6px', borderRadius: 3, fontWeight: 600 }}>{catLabels[g.cat]}</span>
                    </td>
                    <td style={{ padding: '5px 8px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{g.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Specialty popup ─── */}
      {spePopup && SPECIALTIES[spePopup] && (() => {
        const s = SPECIALTIES[spePopup]
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '30px 10px', overflowY: 'auto' }}
            onClick={e => { if (e.target === e.currentTarget) setSpePopup(null) }}>
            <div className="paper-card" style={{ maxWidth: 600, width: '100%', padding: 'var(--space-xl)', background: '#f5f0e1', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{s.icon} {s.name}</h2>
                <button className="btn btn-secondary" onClick={() => setSpePopup(null)}>✕</button>
              </div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>{s.desc}</p>
              <div style={{ background: 'rgba(75,83,32,0.08)', borderLeft: '3px solid var(--military-green)', padding: '12px 16px', borderRadius: 4 }}>
                <h4 style={{ margin: '0 0 var(--space-sm)', fontSize: '0.9rem', color: 'var(--military-green)' }}>📋 Règles en jeu</h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8rem', lineHeight: 1.8 }}>
                  {s.rules.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 'var(--space-md)', fontStyle: 'italic' }}>
                Source : <a href="https://reglements.labaguetterp.fr/militaryrp/reglement-specialisations" target="_blank" rel="noopener noreferrer">Règlement Spécialisations — LaBaguetteRP</a>
              </p>
            </div>
          </div>
        )
      })()}

      {/* ─── Organigramme principal ─── */}
      <div className="paper-card" style={{ overflowX: 'auto', padding: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, minWidth: 600 }}>

          {/* 7. Armeekorps */}
          <div style={{ background: '#2c2c2c', color: '#f5f0e1', padding: '10px 24px', borderRadius: 6, fontWeight: 700, fontSize: '0.85rem', textAlign: 'center', minWidth: 300, border: '2px solid #c9a227', boxShadow: '0 3px 12px rgba(0,0,0,0.3)' }}>
            🦅 7. Armeekorps<br/>
            <span style={{ fontWeight: 400, fontSize: '0.72rem' }}>Kommandeur : </span><CmdText unitKey="7ak" field="kommandeur" placeholder="à définir"/>
          </div>
          <div style={{ width: 2, height: 16, background: '#555' }}/>

          {/* LXXXIV. Armeekorps */}
          <div style={{ background: '#4a3728', color: '#f5f0e1', padding: '10px 24px', borderRadius: 6, fontWeight: 700, fontSize: '0.85rem', textAlign: 'center', minWidth: 300, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            🏛️ LXXXIV. Armeekorps<br/>
            <span style={{ fontWeight: 400, fontSize: '0.72rem' }}>Kommandeur : </span><CmdText unitKey="84ak" field="kommandeur" placeholder="à définir"/><br/>
            <span style={{ fontWeight: 400, fontSize: '0.65rem', opacity: 0.7 }}>Generalstab : </span><CmdText unitKey="84ak" field="generalstab" placeholder="à définir"/>
          </div>
          <div style={{ width: 2, height: 16, background: '#4b5320' }}/>

          {/* Régiments — tous horizontal */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['916', '254', '003', '352', '130', '009'].map(code => {
              const uc = UNIT_COLORS[code]
              const is916 = code === '916'
              const textColor = code === '009' ? '#222' : '#f5f0e1'
              return (
                <div key={code} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 2, height: 10, background: '#4b5320' }}/>
                  <div
                    style={{ background: uc.bg, color: textColor, padding: '8px 10px', borderRadius: 6, textAlign: 'center', minWidth: 105, maxWidth: 140, cursor: 'pointer', transition: 'transform .15s, box-shadow .15s', border: is916 ? '2px solid #c9a227' : '1px solid rgba(255,255,255,0.15)', boxShadow: is916 ? '0 0 10px rgba(201,162,39,0.3)' : '0 2px 6px rgba(0,0,0,0.2)' }}
                    onClick={() => setGradePopup(code)}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = is916 ? '0 0 10px rgba(201,162,39,0.3)' : '0 2px 6px rgba(0,0,0,0.2)' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.78rem', marginBottom: 4 }}>{uc.dot} {code}.</div>
                    <div style={{ fontSize: '0.62rem', opacity: 0.85, lineHeight: 1.3, marginBottom: 4 }}>{uc.label.replace(/^\d+S?\.\s*/, '')}</div>
                    <div style={{ fontSize: '0.62rem', opacity: 0.9 }}>
                      <CmdText unitKey={code} field="kommandeur" placeholder="Kommandeur ?"/>
                    </div>
                    <div style={{ fontSize: '0.58rem', opacity: 0.7 }}>
                      Adj. <CmdText unitKey={code} field="adjoint" placeholder="— vacant —"/>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─── Spécialités du 916 ─── */}
      <div className="paper-card" style={{ marginTop: 'var(--space-lg)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>🎖️ Spécialités — 916. Grenadier-Regiment</h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 var(--space-md)' }}>Cliquer sur une spécialité pour voir à quoi elle sert et ses règles en jeu</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {Object.entries(SPECIALTIES).map(([key, s]) => (
            <div key={key}
              style={{ background: 'rgba(75,83,32,0.1)', border: '1px solid rgba(75,83,32,0.3)', borderRadius: 6, padding: '8px 12px', textAlign: 'center', minWidth: 85, cursor: 'pointer', transition: 'background .15s, transform .15s' }}
              onClick={() => setSpePopup(key)}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(75,83,32,0.25)'; e.currentTarget.style.transform = 'scale(1.05)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(75,83,32,0.1)'; e.currentTarget.style.transform = 'scale(1)' }}
            >
              <div style={{ fontSize: '1.3rem' }}>{s.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.7rem', lineHeight: 1.3, marginTop: 2 }}>{s.name.split(' / ')[0]}</div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.name.split(' / ')[1] || ''}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Légende ─── */}
      <div className="paper-card" style={{ marginTop: 'var(--space-lg)' }}>
        <h3 style={{ marginTop: 0, fontSize: '0.9rem' }}>📋 Légende</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          {Object.entries(UNIT_COLORS).map(([code, uc]) => (
            <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: uc.bg }}/>
              <span>{uc.label}</span>
            </div>
          ))}
        </div>
        {canEdit && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
          ✏️ Officiers/Administratifs : cliquez sur les noms de commandants pour les modifier.
        </p>}
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)', fontStyle: 'italic' }}>
          Source spécialités : <a href="https://reglements.labaguetterp.fr/militaryrp/reglement-specialisations" target="_blank" rel="noopener noreferrer">Règlement LaBaguetteRP</a>
        </p>
      </div>
    </div>
  )
}
