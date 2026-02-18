import React, { useState, useEffect } from 'react'
import { useAuth } from '../../auth/useAuth'
import api from '../../api/client'
import SignaturePopup from '../../components/SignaturePopup'
import './soldbuch-book.css'

const NB = '\u00A0'
const Ink = ({children,small}) => (children||children===0) ? <span className={`sb-ink${small?' sb-ink-sm':''}`}>{children}</span> : null
const PageNum = ({n}) => <div className="sb-pagenum">— {n} —</div>
const R = ({l,v}) => <tr><td className="sb-lbl-cell">{l||NB}</td><td className="sb-val-cell">{v?<Ink>{v}</Ink>:NB}</td></tr>
const R4 = ({a,b,c,d}) => <tr><td className="sb-lbl-cell">{a||NB}</td><td className="sb-val-cell">{b?<Ink>{b}</Ink>:NB}</td><td className="sb-lbl-cell">{c||NB}</td><td className="sb-val-cell">{d?<Ink>{d}</Ink>:NB}</td></tr>
const ER = ({cols,n}) => <>{Array.from({length:n},(_,i)=><tr key={i}>{Array.from({length:cols},(_,j)=><td key={j}>{NB}</td>)}</tr>)}</>

function getTheme(c){if(!c)return'heer';c=String(c).toLowerCase();return{['009']:'luftwaffe',['254']:'feld',['130']:'panzer',['916s']:'sanit',['001']:'marine'}[c]||'heer'}
function genWehr(e){return e.wehrnummer||`${e.unite_code||'000'}/${String(e.grade_rang||0).padStart(2,'0')}/${String(e.id).padStart(3,'0')}`}

const EAGLE_H='/assets/eagles/heer-eagle.svg', EAGLE_L='/assets/eagles/luftwaffe-eagle.svg'

const REGLES=[
  "Le Soldbuch sert de pièce d'identité au soldat en temps de guerre et l'autorise à percevoir sa solde auprès de sa propre unité ou d'unités étrangères.",
  "Il sert également de justificatif pour la réception du courrier, les voyages en train, les détachements et les permissions.",
  "Le soldat doit toujours porter le Soldbuch dans la poche de sa veste.",
  "Le ranger dans les bagages, au quartier ou ailleurs est strictement interdit.",
  "La conservation soigneuse du Soldbuch est dans l'intérêt du détenteur.",
  "Le Soldbuch doit être tenu de manière ordonnée.",
  "Le détenteur doit veiller lui-même à ce que toute modification de solde suite à une promotion ou un transfert soit immédiatement inscrite par son service.",
  "Le Soldbuch est un document officiel. Seuls les services de la Wehrmacht sont habilités à y faire des inscriptions.",
  "Toute modification non autorisée constitue un faux en écriture.",
  "La perte du Soldbuch doit être signalée sans délai par le détenteur à son unité ; l'établissement d'un nouveau Soldbuch doit être demandé."
]
const W8A=['Fusil','Pistolet','Baïonnette','Boussole','Jumelles','Pioche','Pelle','Hachette']
const W8B=['Cisaille','Kit nettoyage','Masque à gaz','Lunettes masque','Ouate/vaseline']

// Presets équipement par spécialité (historique 352. ID / 916. GR)
const EQUIP_PRESETS = {
  'Grenadier': {
    equip: { 'Fusil': 'Karabiner 98k', 'Baïonnette': 'SG 84/98', 'Pelle': 'Klappspaten', 'Masque à gaz': 'GM30' },
    tenue: ['Stahlhelm M35', 'Feldbluse M43', 'Feldhose M43', 'Marschstiefel', 'Koppel + Y-Riemen', 'Brotbeutel', 'Feldflasche', 'Zeltbahn']
  },
  'Panzergrenadier': {
    equip: { 'Fusil': 'MP 40', 'Pistolet': 'P38', 'Pelle': 'Klappspaten', 'Masque à gaz': 'GM30' },
    tenue: ['Stahlhelm M42', 'Feldbluse M43', 'Feldhose M43', 'Schnürschuhe + Gamaschen', 'Koppel', 'Sturmgepäck', 'Zeltbahn']
  },
  'Pionnier': {
    equip: { 'Fusil': 'Karabiner 98k', 'Pioche': 'Kreuzhacke', 'Pelle': 'Klappspaten', 'Cisaille': 'Drahtschere', 'Masque à gaz': 'GM30' },
    tenue: ['Stahlhelm M35', 'Feldbluse M43 (Pionier)', 'Feldhose M43', 'Marschstiefel', 'Koppel + Y-Riemen', 'Pionier-Sturmgepäck', 'Zeltbahn']
  },
  'Panzerjäger': {
    equip: { 'Fusil': 'Karabiner 98k', 'Pistolet': 'P38', 'Jumelles': 'Scherenfernrohr', 'Masque à gaz': 'GM30' },
    tenue: ['Feldmütze M43', 'Feldbluse M43', 'Feldhose M43', 'Marschstiefel', 'Koppel', 'Zeltbahn']
  },
  'MG-Schütze': {
    equip: { 'Fusil': 'MG 42', 'Pistolet': 'P08', 'Pelle': 'Klappspaten', 'Masque à gaz': 'GM30' },
    tenue: ['Stahlhelm M42', 'Feldbluse M43', 'Feldhose M43', 'Marschstiefel', 'Koppel + Y-Riemen', 'MG-Zubehör Tasche', 'Zeltbahn']
  },
  'Sanitäter': {
    equip: { 'Fusil': '—', 'Pistolet': 'P38', 'Masque à gaz': 'GM30' },
    tenue: ['Stahlhelm M35 + Rotes Kreuz', 'Feldbluse M43 (Sanitäts)', 'Feldhose M43', 'Marschstiefel', 'Sanitätstasche', 'Verbandkasten', 'Armbinde Rotes Kreuz']
  },
  'Funker': {
    equip: { 'Fusil': 'Karabiner 98k', 'Masque à gaz': 'GM30' },
    tenue: ['Stahlhelm M35', 'Feldbluse M43', 'Feldhose M43', 'Marschstiefel', 'Tornister Funkgerät', 'Feldfernsprecher 33', 'Koppel']
  },
  'Offizier': {
    equip: { 'Pistolet': 'Walther P38', 'Jumelles': 'Dienstglas 6x30', 'Boussole': 'Marschkompass' },
    tenue: ['Schirmmütze', 'Feldbluse Offizier', 'Reithose + Schaftstiefel', 'Koppelschloss Offizier', 'Kartentasche', 'Fernglastasche']
  },
  'Scharfschütze': {
    equip: { 'Fusil': 'Karabiner 98k + ZF 41 (4x)', 'Pistolet': 'P38', 'Pelle': 'Klappspaten', 'Masque à gaz': 'GM30' },
    tenue: ['Stahlhelm M35 + Tarnnetz', 'Feldbluse M43 + Splittermuster', 'Feldhose M43', 'Marschstiefel', 'Koppel + Y-Riemen', 'Brotbeutel', 'Feldflasche', 'Zeltbahn']
  },
  'Artilleur': {
    equip: { 'Pistolet': 'P38', 'Jumelles': 'Scherenfernrohr', 'Masque à gaz': 'GM30' },
    tenue: ['Stahlhelm M35', 'Feldbluse M43 (Artillerie)', 'Feldhose M43', 'Marschstiefel', 'Koppel', 'Entfernungsmesser', 'Zeltbahn']
  },
  'Flammenwerfer': {
    equip: { 'Flammenwerfer': 'Flammenwerfer 41', 'Pistolet': 'P38', 'Masque à gaz': 'GM30' },
    tenue: ['Stahlhelm M42', 'Feldbluse M43', 'Feldhose M43', 'Marschstiefel', 'Koppel', 'Zeltbahn']
  },
  'Feldgendarme': {
    equip: { 'Fusil': 'MP 40', 'Pistolet': 'P38', 'Pelle': 'Klappspaten', 'Masque à gaz': 'GM30' },
    tenue: ['Stahlhelm M35 + Feldgend. Ringkragen', 'Feldbluse M43', 'Feldhose M43', 'Marschstiefel', 'Koppel + Y-Riemen', 'Signallampe', 'Pfeife', 'Handschellen', 'Zeltbahn']
  },
  'Équipement de base': {
    equip: { 'Fusil': 'Karabiner 98k', 'Baïonnette': 'SG 84/98', 'Pelle': 'Klappspaten', 'Masque à gaz': 'GM30' },
    tenue: ['Stahlhelm M35', 'Feldbluse M43', 'Feldhose M43', 'Marschstiefel', 'Koppel + Y-Riemen', 'Brotbeutel', 'Feldflasche', 'Kochgeschirr', 'Zeltbahn', 'Tornister/Affe', 'Erkennungsmarke + Schnur', 'Verbandpäckchen', 'Soldbuch']
  }
}

// Unités de campagne historiques liées au 916. GR / 352. ID
const CAMPAIGN_UNITS = [
  '916. Grenadier-Regiment',
  '915. Grenadier-Regiment', 
  '914. Grenadier-Regiment',
  'Füsilier-Bataillon 352',
  'Artillerie-Regiment 352',
  'Panzerjäger-Abteilung 352',
  'Pionier-Bataillon 352',
  'Nachrichten-Abteilung 352',
  'Feldersatz-Bataillon 352',
  'Grenadier-Ersatz Bataillon 396',
  'Infanterie-Ersatz Bataillon 480',
  'Grenadier-Regiment 546 (Ost)',
  '268. Infanterie-Division (Ost)',
  '321. Infanterie-Division (Ost)',
  '716. Infanterie-Division'
]

export default function SoldbuchBook({effectif,decorations=[],hospitalisations=[],vaccinations=[],blessures=[],permissions=[],bookCells:initCells={},attestations=[],pendingEdits=[],soldeData=[],soldeBalance=0,onUpdate}){
  const { user } = useAuth()
  const[isOpen,setIsOpen]=useState(false)
  const[spread,setSpread]=useState(0)
  const[sigPopup,setSigPopup]=useState(null)
  const[stampPicker,setStampPicker]=useState(false)
  const[tampons,setTampons]=useState([])
  const[saving,setSaving]=useState(false)
  const[cells,setCells]=useState(initCells||{})
  const[editingCell,setEditingCell]=useState(null)
  const[editVal,setEditVal]=useState('')
  const[habPopup,setHabPopup]=useState(false)
  const[habDesc,setHabDesc]=useState('')
  const[habMotif,setHabMotif]=useState('')
  const[habMsg,setHabMsg]=useState('')
  const[rotated,setRotated]=useState(false)
  const fmtD=(d)=>{if(!d)return'—';try{return new Date(d).toLocaleDateString('fr-FR')}catch{return d}}
  const e=effectif, theme=getTheme(e.unite_code), isLw=theme==='luftwaffe'
  const branch={luftwaffe:'Luftwaffe',marine:'Kriegsmarine'}[theme]||null
  const TOTAL=14

  // Permissions
  const isOwner = user?.effectif_id === e.id
  const isOfficier = user?.isOfficier
  const isAdmin = user?.isAdmin
  const canSignSoldat = isOwner && !e.signature_soldat
  const canSignReferent = (isOfficier || user?.isRecenseur) && !e.signature_referent
  const canSignAttestation = isOfficier || user?.isRecenseur
  const canStamp = (isOfficier || isAdmin || user?.isRecenseur) && !e.stamp_path
  const canEditDirect = isOfficier || isAdmin || user?.isRecenseur  // Edit without validation
  const canEditPending = isOwner && !canEditDirect  // Soldier: needs validation
  const canEdit = canEditDirect || canEditPending

  // Sync cells when prop changes
  useEffect(()=>{setCells(initCells||{})},[initCells])

  // Save a cell edit to backend
  const saveCell = async (cellId, value) => {
    if (canEditDirect) {
      // Direct save
      const newCells = { ...cells }
      if (value) newCells[cellId] = value; else delete newCells[cellId]
      setCells(newCells)
      setEditingCell(null)
      try { await api.put(`/soldbuch/${e.id}/book-cells`, { cellId, value }) } catch(err) { console.error('Save cell error:', err) }
    } else if (canEditPending) {
      // Submit for validation
      setEditingCell(null)
      try {
        await api.post(`/attestations/pending/${e.id}`, { cell_id: cellId, old_value: cells[cellId] || '', new_value: value })
        alert('Modification soumise pour validation ✓')
        if (onUpdate) onUpdate()
      } catch (err) { alert(err.response?.data?.message || 'Erreur') }
    }
  }

  // Editable cell: click to edit, shows saved value or empty
  const blurTimer = React.useRef(null)
  function EC({ id, placeholder, serial }) {
    const val = cells[id] || ''
    if (editingCell === id) {
      return <span style={{display:'inline-flex',gap:3,alignItems:'center',width:'100%'}}>
        <input type="text" value={editVal} onChange={ev=>setEditVal(ev.target.value)}
          onKeyDown={ev=>{if(ev.key==='Enter')saveCell(id,editVal);if(ev.key==='Escape')setEditingCell(null)}}
          onBlur={()=>{blurTimer.current=setTimeout(()=>saveCell(id,editVal),150)}}
          autoFocus style={{flex:1,border:'none',borderBottom:'1px solid var(--military-green)',background:'transparent',fontFamily:'inherit',fontSize:'inherit',padding:'1px 2px',color:'var(--ink-color, #1a1a2e)'}}
          placeholder={placeholder||''} />
        {serial && <button onMouseDown={(ev)=>{ev.preventDefault();clearTimeout(blurTimer.current);const sn=genSerial();setEditVal(sn);saveCell(id,sn)}} title="Générer N° série" style={{background:'var(--military-green)',color:'white',border:'none',cursor:'pointer',fontSize:'.65rem',padding:'2px 5px',borderRadius:3,whiteSpace:'nowrap'}}>🎲 N°</button>}
        <button onMouseDown={(ev)=>{ev.preventDefault();clearTimeout(blurTimer.current);saveCell(id,editVal)}} style={{background:'var(--military-green)',color:'white',border:'none',cursor:'pointer',fontSize:'.65rem',padding:'2px 5px',borderRadius:3}}>✓</button>
      </span>
    }
    if (val) return <span style={{display:'inline-flex',gap:3,alignItems:'center'}}>
      <span className="sb-ink sb-ink-sm" style={{cursor:canEdit?'pointer':'default'}} onClick={()=>{if(canEdit){setEditingCell(id);setEditVal(val)}}}>{val}</span>
      {serial && canEdit && <button onClick={()=>{const sn=genSerial();saveCell(id,sn)}} title="Regénérer" style={{background:'none',border:'none',cursor:'pointer',fontSize:'.6rem',padding:0,opacity:.5}}>🎲</button>}
    </span>
    if (!canEdit) return <>{NB}</>
    return <span style={{display:'inline-flex',gap:3,alignItems:'center',cursor:'pointer'}} onClick={()=>{setEditingCell(id);setEditVal('')}}>
      <span style={{color:'var(--text-muted)',fontSize:'.6rem',opacity:.5}}>{placeholder||'...'}</span>
      {serial && <button onClick={(ev)=>{ev.stopPropagation();const sn=genSerial();saveCell(id,sn)}} title="Générer N° série" style={{background:'var(--military-green)',color:'white',border:'none',cursor:'pointer',fontSize:'.55rem',padding:'1px 4px',borderRadius:3,whiteSpace:'nowrap'}}>🎲 N°</button>}
    </span>
  }

  // Serial number generator: UNIT-YYYY-NNNN
  function genSerial() {
    const yr = new Date().getFullYear()
    const rnd = String(Math.floor(Math.random()*9000)+1000)
    return `${e.unite_code||'000'}-${yr}-${rnd}`
  }

  // Load tampons from bibliothèque when stamp picker opens
  useEffect(() => {
    if (stampPicker) {
      api.get('/bibliotheque?type=tampon').then(r => setTampons(r.data?.data || r.data || [])).catch(() => {})
    }
  }, [stampPicker])

  // Sign handler
  const handleSign = async (signatureData) => {
    if (!sigPopup) return
    setSaving(true)
    try {
      if (sigPopup.slot === 'attestation' && sigPopup.attestationId) {
        // Sign an existing attestation
        await api.put(`/attestations/${sigPopup.attestationId}/sign`, { signature_data: signatureData })
      } else if (sigPopup.slot === 'attestation-cell' && sigPopup.cellRow) {
        // Save manual attestation row as a real attestation + sign it
        const row = sigPopup.cellRow
        // Read from sigPopup captured values (set at click time) to avoid race with blur timer
        const mod = sigPopup.mod || cells[`att-${row}-mod`] || ''
        const page = sigPopup.page || cells[`att-${row}-page`] || ''
        const date = sigPopup.date || cells[`att-${row}-date`] || ''
        await api.post(`/attestations/manual/${e.id}`, {
          numero: row, modification: mod, page, date_attestation: date, signature_data: signatureData
        })
      } else {
        await api.put(`/soldbuch/${e.id}/sign`, { slot: sigPopup.slot, signature_data: signatureData })
      }
      setSigPopup(null)
      if (onUpdate) onUpdate()
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur signature')
    }
    setSaving(false)
  }

  // Stamp handler
  const handleStamp = async (stampPath) => {
    setSaving(true)
    try {
      await api.put(`/soldbuch/${e.id}/stamp`, { stamp_path: stampPath })
      setStampPicker(false)
      if (onUpdate) onUpdate()
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur tampon')
    }
    setSaving(false)
  }

  // Clickable signature slot component
  function SigSlot({ data, slot, label, canSign: allowed }) {
    if (data) {
      return <div className="sb-sig-area"><img src={data} alt={label} className="sb-sig-img"/><p className="sb-xs">{label}</p></div>
    }
    if (allowed) {
      return <div className="sb-sig-area sb-sig-clickable" onClick={() => setSigPopup({ slot })}>
        <div className="sb-sig-box sb-sig-empty">✍️ Signer</div>
        <p className="sb-xs">{label}</p>
      </div>
    }
    return <div className="sb-sig-area"><div className="sb-sig-box">{NB}</div><p className="sb-xs">{label}</p></div>
  }

  // Clickable stamp slot
  function StampSlot({ data }) {
    if (data) return <img src={data} alt="Tampon" className="sb-stamp-img"/>
    if (canStamp) return <div className="sb-stamp-clickable" onClick={() => setStampPicker(true)}>🔏 Tampon</div>
    return null
  }

  if(!isOpen) return(
    <div className={`sb-wrapper sb-theme-${theme}`}>
      <div className="sb-cover" onClick={()=>setIsOpen(true)}>
        <span className="sb-cover-name">{e.nom}</span>
        <div className="sb-cover-border">
          <img src={isLw?EAGLE_L:EAGLE_H} alt="" className="sb-cover-eagle"/>
          <div className="sb-cover-title">Soldbuch</div>
          <div className="sb-cover-sub">Livret de solde</div>
          {branch&&<div className="sb-cover-branch">{branch}</div>}
        </div>
        <div className="sb-cover-hint">Cliquer pour ouvrir</div>
      </div>
    </div>
  )

  const S=[]

  /* 0: Règlement | Page 1 */
  S.push(<div className="sb-spread" key="s0">
    <div className="sb-page sb-page-l sb-page-dark">
      <div className="sb-gebote">
        <h3>10 Commandements</h3>
        <h4>pour la conduite du soldat allemand en temps de guerre</h4>
        <ol>{REGLES.map((r,i)=><li key={i}>{r}</li>)}</ol>
        <div style={{marginTop:'0.5rem',fontSize:'0.5rem',opacity:0.5}}>W.N.3. 11/III. 4. 1000. 4/1901.</div>
      </div>
    </div>
    <div className="sb-page sb-page-r">
      <div style={{textAlign:'center',marginBottom:'1rem'}}>
        <div style={{fontSize:'1.4rem',fontWeight:700,letterSpacing:'4px'}}>Soldbuch</div>
        <div style={{fontSize:'0.7rem',letterSpacing:'2px'}}>et carte d'identité</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.8rem'}}>
        <span style={{fontWeight:700}}>Nr.</span>
        <span style={{background:'rgba(0,0,0,0.08)',padding:'2px 16px',borderBottom:'1px solid rgba(0,0,0,0.3)',flex:1,textAlign:'center',fontWeight:600}}><Ink>{e.id||'—'}</Ink></span>
      </div>
      <div style={{textAlign:'center',marginBottom:'0.5rem',fontWeight:600}}>pour</div>
      <div className="sb-field"><span className="sb-field-label">le</span><span className="sb-field-value"><Ink>{e.grade_nom||'\u00A0'}</Ink></span></div>
      {!e.grade_nom&&<div style={{textAlign:'center',fontSize:'0.65rem',opacity:0.5,marginBottom:'0.5rem'}}>(rang)</div>}
      <div className="sb-box">
        {!e.date_entree_ig&&<div className="sb-promo-row">
          <span className="sb-promo-label" style={{minWidth:'auto'}}>{'\u00A0'}</span>
          <span className="sb-promo-date" style={{textAlign:'center',fontSize:'0.65rem',opacity:0.5,borderBottom:'none'}}>(Date)</span>
          <span className="sb-promo-grade" style={{textAlign:'center',fontSize:'0.65rem',opacity:0.5,borderBottom:'none'}}>(nouveau grade)</span>
        </div>}
        <div className="sb-promo-row"><span className="sb-promo-label">le</span><span className="sb-promo-date"><Ink small>{e.date_entree_ig||''}</Ink></span><span className="sb-promo-grade"><Ink small>{e.grade_nom||''}</Ink></span></div>
        <div className="sb-promo-row"><span className="sb-promo-label">le</span><span className="sb-promo-date"></span><span className="sb-promo-grade"></span></div>
        <div className="sb-promo-row"><span className="sb-promo-label">le</span><span className="sb-promo-date"></span><span className="sb-promo-grade"></span></div>
      </div>
      <div style={{marginTop:'1.5rem'}}>
        <div className="sb-field"><span className="sb-field-value" style={{textAlign:'center',fontWeight:600,fontSize:'0.95rem'}}><Ink>{`${e.prenom||''} ${e.nom||''}`}</Ink></span></div>
        {!(e.prenom||e.nom)&&<div style={{textAlign:'center',fontSize:'0.65rem',opacity:0.5}}>(Prénom et nom)</div>}
      </div>
      <div className="sb-spacer"/>
      <div className="sb-field"><span className="sb-field-label">Plaque d'identité</span><span className="sb-field-value"><Ink>{e.numero_service||'\u00A0'}</Ink></span></div>
      <div className="sb-field"><span className="sb-field-label">Groupe sanguin</span><span className="sb-field-value"><Ink>{e.blutgruppe||'\u00A0'}</Ink></span></div>
      <div className="sb-field"><span className="sb-field-label">Taille du masque à gaz</span><span className="sb-field-value"><Ink>{e.gasmaskengroesse||'\u00A0'}</Ink></span></div>
      <div className="sb-field"><span className="sb-field-label">Numéro de service</span><span className="sb-field-value"><Ink>{genWehr(e)||'\u00A0'}</Ink></span></div>
      <PageNum n={1}/>
    </div>
  </div>)

  /* 1: Page 2 | Page 3 */
  S.push(<div className="sb-spread" key="s1">
    <div className="sb-page sb-page-l">
      <div className="sb-photo">{e.photo?<img src={e.photo} alt=""/>:<span className="sb-photo-empty">Photo</span>}</div>
      <table className="sb-t"><tbody><R l="Né le" v={e.date_naissance}/><R l="à" v={e.lieu_naissance}/></tbody></table>
      <p className="sb-center sb-xs">(Lieu, canton)</p>
      <table className="sb-t"><tbody><R4 a="Religion" b={e.religion} c="Profession" d={e.beruf}/></tbody></table>
      <h4 className="sb-center">Description personnelle</h4>
      <table className="sb-t"><tbody>
        <R4 a="Taille" b={e.taille_cm?`${e.taille_cm}cm`:''} c="Corpulence" d={e.gestalt}/>
        <R4 a="Visage" b={e.gesicht} c="Cheveux" d={e.haar}/>
        <R4 a="Barbe" b={e.bart} c="Yeux" d={e.augen}/>
      </tbody></table>
      <table className="sb-t"><tbody>
        <R l="Signes particuliers" v={e.besondere_kennzeichen}/>
        <R4 a="Pointure" b={e.schuhzeuglaenge} c="Largeur" d=""/>
      </tbody></table>
      <div className="sb-spacer"/>
      <SigSlot data={e.signature_soldat} slot="soldat" label="(Signature du détenteur)" canSign={canSignSoldat}/>
      <div className="sb-stamp-row">
        <StampSlot data={e.stamp_path}/>
        <SigSlot data={e.signature_referent} slot="referent" label="(Signature officier référent)" canSign={canSignReferent}/>
      </div>
      <PageNum n={2}/>
    </div>
    <div className="sb-page sb-page-r">
      <div className="sb-land">
      <h4 className="sb-center">Attestations</h4>
      <p className="sb-center sb-xs">Modifications aux pages 1 et 2</p>
      <div className="sb-att-wrap">
        <table className="sb-t">
          <thead><tr><th>N°</th><th>Modification</th><th>Page</th><th>Date</th><th>Signature</th></tr></thead>
          <tbody>
            {attestations.map((a)=>{
              const barreStyle = a.barre ? { textDecoration:'line-through', opacity:0.5 } : {}
              return <tr key={a.id} style={barreStyle} title={a.barre ? `Barré: ${a.motif_barre||''}` : ''}>
                <td><Ink small>{a.numero}</Ink></td>
                <td><Ink small>{a.modification}</Ink>{a.barre && <span style={{fontSize:'.5rem',color:'#8b0000',display:'block',textDecoration:'none',opacity:1}}>({a.motif_barre})</span>}</td>
                <td><Ink small>{a.page||''}</Ink></td>
                <td><Ink small>{fmtD(a.date_attestation)}</Ink></td>
                <td>
                  {a.signature_data?<>{NB}<img src={a.signature_data} alt="sig" className="sb-att-stamp"/></>
                  :a.signe_par_nom?<Ink small>{a.signe_par_nom}</Ink>
                  :(canSignAttestation && !a.barre?<span className="sb-sig-clickable" style={{cursor:'pointer',fontSize:'.55rem',color:'var(--military-green)'}} onClick={()=>setSigPopup({slot:'attestation',attestationId:a.id})}>✍️</span>:NB)}
                  {!a.barre && canSignAttestation && <span style={{cursor:'pointer',fontSize:'.5rem',marginLeft:3,color:'#8b0000'}} title="Barrer" onClick={async()=>{
                    const motif=prompt('Motif de la rature :')
                    if(!motif) return
                    try{await api.put(`/attestations/${a.id}/barrer`,{motif});if(onUpdate) await onUpdate()}catch(err){console.error('Barrer attestation error:',err);alert('Erreur: '+(err?.response?.data?.message||err.message))}
                  }}>✕</span>}
                  {isAdmin && <span style={{cursor:'pointer',fontSize:'.5rem',marginLeft:3,color:'#e74c3c'}} title="Supprimer" onClick={async()=>{
                    if(!confirm('Supprimer cette attestation ?')) return
                    try{await api.delete(`/attestations/${a.id}`);if(onUpdate) await onUpdate()}catch(err){console.error('Delete attestation error:',err);alert('Erreur: '+(err?.response?.data?.message||err.message))}
                  }}>🗑</span>}
                </td>
              </tr>
            })}
            {Array.from({length:Math.max(0,18-attestations.length)},(_,i)=>{
              const rowN = attestations.length+i+1
              return <tr key={`att-e-${i}`}>
                <td style={{fontSize:'.6rem',color:'var(--text-muted)'}}>{rowN}</td>
                <td><EC id={`att-${rowN}-mod`} placeholder="modification"/></td>
                <td><EC id={`att-${rowN}-page`} placeholder="p."/></td>
                <td><EC id={`att-${rowN}-date`} placeholder="date"/></td>
                <td>{(cells[`att-${rowN}-mod`] && canSignAttestation) ? <span className="sb-sig-clickable" style={{cursor:'pointer',fontSize:'.55rem',color:'var(--military-green)'}} onClick={()=>{
                  // Flush any pending blur and capture current cell values
                  clearTimeout(blurTimer.current)
                  if(editingCell){const cid=editingCell;const v=editVal;saveCell(cid,v)}
                  setSigPopup({slot:'attestation-cell',cellRow:rowN,mod:cells[`att-${rowN}-mod`]||'',page:cells[`att-${rowN}-page`]||'',date:cells[`att-${rowN}-date`]||''})
                }}>✍️ Signer</span> : NB}</td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
      <PageNum n={3}/>
      </div>{/* sb-land */}
    </div>
  </div>)

  /* 2: Page 4 | Page 5 */
  S.push(<div className="sb-spread" key="s2">
    <div className="sb-page sb-page-l">
      <table className="sb-t"><tbody><tr><td className="sb-lbl-cell">A. Bureau de recrutement</td><td className="sb-val-cell"><EC id="p4-bureau-recr" placeholder="bureau"/></td></tr></tbody></table>
      <p className="sb-label">B. Envoyé à l'armée par :</p>
      <table className="sb-t">
        <colgroup><col style={{width:'8%'}}/><col/><col style={{width:'14%'}}/><col style={{width:'18%'}}/></colgroup>
        <thead><tr><th>{NB}</th><th>Unité de remplacement</th><th>Cie</th><th>N° registre</th></tr></thead>
        <tbody><tr><td>a</td><td><Ink small>{`${e.unite_code||''} ${e.unite_nom||''}`.trim()}</Ink></td><td><EC id="p4-b-cie-a"/></td><td><EC id="p4-b-reg-a" serial/></td></tr><tr><td>b</td><td><EC id="p4-b-unite-b"/></td><td><EC id="p4-b-cie-b"/></td><td><EC id="p4-b-reg-b" serial/></td></tr><tr><td>c</td><td><EC id="p4-b-unite-c"/></td><td><EC id="p4-b-cie-c"/></td><td><EC id="p4-b-reg-c" serial/></td></tr></tbody>
      </table>
      <p className="sb-label">C. Unité de campagne :</p>
      <table className="sb-t">
        <colgroup><col style={{width:'8%'}}/><col/><col style={{width:'14%'}}/><col style={{width:'18%'}}/></colgroup>
        <thead><tr><th>{NB}</th><th>Unité de campagne</th><th>Cie</th><th>N° guerre</th></tr></thead>
        <tbody>{[1,2,3].map(n=><tr key={n}><td>{n}</td><td>{canEdit && !cells[`p4-camp-${n}`] ? <select className="form-input" style={{fontSize:'.55rem',padding:'1px 2px',border:'none',background:'transparent'}} onChange={ev=>{if(!ev.target.value)return;const nc={...cells};nc[`p4-camp-${n}`]=ev.target.value;setCells(nc);api.put(`/soldbuch/${e.id}/book-cells`,{cellId:`p4-camp-${n}`,value:ev.target.value}).catch(()=>{})}}>
          <option value="">Choisir...</option>
          {CAMPAIGN_UNITS.map(u=><option key={u} value={u}>{u}</option>)}
          <option value="__custom">Autre (saisie libre)</option>
        </select> : <EC id={`p4-camp-${n}`}/>}</td><td><EC id={`p4-camp-cie-${n}`}/></td><td><EC id={`p4-camp-nr-${n}`} serial/></td></tr>)}</tbody>
      </table>
      <p className="sb-label">D.</p>
      <table className="sb-t">
        <thead><tr><th>Unité actuelle</th><th style={{width:'30%'}}>Garnison</th></tr></thead>
        <tbody><tr><td><Ink small>{`${e.unite_code||''} ${e.unite_nom||''}`.trim()||NB}</Ink></td><td><EC id="p4-garni-1"/></td></tr><tr><td><EC id="p4-unite-2"/></td><td><EC id="p4-garni-2"/></td></tr></tbody>
      </table>
      <div className="sb-spacer"/>
      <p className="sb-sm">→ Suite page 17.</p>
      <PageNum n={4}/>
    </div>
    <div className="sb-page sb-page-r">
      <h4 className="sb-center">Adresses des proches</h4>
      <table className="sb-t"><tbody><R l="de" v={`${e.prenom||''} ${e.nom||''}`}/></tbody></table>
      <p className="sb-label">1. Épouse</p>
      <table className="sb-t"><tbody><tr><td className="sb-lbl-cell">Nom</td><td className="sb-val-cell"><EC id="p5-ep-nom"/></td></tr><tr><td className="sb-lbl-cell">Domicile</td><td className="sb-val-cell"><EC id="p5-ep-dom"/></td></tr><tr><td className="sb-lbl-cell">Rue</td><td className="sb-val-cell"><EC id="p5-ep-rue"/></td></tr></tbody></table>
      <p className="sb-label">2. Parents</p>
      <table className="sb-t"><tbody><tr><td className="sb-lbl-cell">Père</td><td className="sb-val-cell"><EC id="p5-pere"/></td></tr><tr><td className="sb-lbl-cell">Profession</td><td className="sb-val-cell"><EC id="p5-pere-prof"/></td></tr><tr><td className="sb-lbl-cell">Mère</td><td className="sb-val-cell"><EC id="p5-mere"/></td></tr><tr><td className="sb-lbl-cell">Domicile</td><td className="sb-val-cell"><EC id="p5-par-dom"/></td></tr><tr><td className="sb-lbl-cell">Rue</td><td className="sb-val-cell"><EC id="p5-par-rue"/></td></tr></tbody></table>
      <p className="sb-label">3. Autre proche*</p>
      <table className="sb-t"><tbody><tr><td className="sb-lbl-cell">Nom</td><td className="sb-val-cell"><EC id="p5-aut-nom"/></td></tr><tr><td className="sb-lbl-cell">Profession</td><td className="sb-val-cell"><EC id="p5-aut-prof"/></td></tr><tr><td className="sb-lbl-cell">Domicile</td><td className="sb-val-cell"><EC id="p5-aut-dom"/></td></tr><tr><td className="sb-lbl-cell">Rue</td><td className="sb-val-cell"><EC id="p5-aut-rue"/></td></tr></tbody></table>
      <div className="sb-spacer"/>
      <p className="sb-xs">* Seulement si 1 et 2 non remplis.</p>
      <PageNum n={5}/>
    </div>
  </div>)

  /* 3: Page 6 | Page 7 */
  S.push(<div className="sb-spread" key="s3">
    <div className="sb-page sb-page-l">
      <div className="sb-land">
      <h4 className="sb-center">Habillement</h4>
      <table className="sb-t sb-t-grid">
        <thead><tr><th>N°</th><th>Calot</th><th>Veste</th><th>Pantalon</th><th>Manteau</th></tr></thead>
        <tbody>{Array.from({length:12},(_,i)=><tr key={i}><td>{i+1}</td><td><EC id={`tenue-${i+1}`} placeholder="—"/></td><td><EC id={`hab-veste-${i+1}`} placeholder="—"/></td><td><EC id={`hab-pant-${i+1}`} placeholder="—"/></td><td><EC id={`hab-mant-${i+1}`} placeholder="—"/></td></tr>)}</tbody>
      </table>
      <PageNum n={6}/>
      </div>
    </div>
    <div className="sb-page sb-page-r">
      <div className="sb-land">
      <h4 className="sb-center">Équipement</h4>
      <table className="sb-t sb-t-grid">
        <thead><tr><th>Bottes</th><th>Casque</th><th>Sac</th><th>Ceint.</th><th>Gourde</th><th>Date</th></tr></thead>
        <tbody>{Array.from({length:12},(_,i)=><tr key={i}><td><EC id={`eq-botte-${i+1}`} placeholder="—"/></td><td><EC id={`eq-casque-${i+1}`} placeholder="—"/></td><td><EC id={`eq-sac-${i+1}`} placeholder="—"/></td><td><EC id={`eq-ceint-${i+1}`} placeholder="—"/></td><td><EC id={`eq-gourde-${i+1}`} placeholder="—"/></td><td><EC id={`eq-date-${i+1}`} placeholder="—"/></td></tr>)}</tbody>
      </table>
      <PageNum n={7}/>
      </div>
    </div>
  </div>)

  /* 4: Page 8 | Page 8a */
  S.push(<div className="sb-spread" key="s4">
    <div className="sb-page sb-page-l">
      <h4 className="sb-center">Remarques habillement</h4>
      <p className="sb-xs sb-center">(Échanges, demandes spéciales)</p>
      <div className="sb-lined">{Array.from({length:14},(_,i)=><div key={i} className="sb-line"/>)}</div>
      {canEdit && <div style={{marginTop:6,textAlign:'center'}}>
        <button className="btn btn-secondary" style={{fontSize:'.6rem',padding:'3px 8px'}} onClick={()=>{setHabPopup(true);setHabDesc('');setHabMotif('');setHabMsg('')}}>📝 Faire une demande d'habillement</button>
      </div>}
      <PageNum n={8}/>
    </div>
    <div className="sb-page sb-page-r">
      <div className="sb-land">
      <h4 className="sb-center">Armes et matériel</h4>
      {canEdit && <div style={{marginBottom:6,textAlign:'center'}}>
        <select className="form-input" style={{fontSize:'.6rem',padding:'2px 4px',width:'auto',display:'inline'}} onChange={ev=>{
          const preset = EQUIP_PRESETS[ev.target.value]
          if(!preset) return
          const nc = {...cells}
          // Armes et matériel (page 8a)
          Object.entries(preset.equip).forEach(([type,val])=>{nc[`w8a-${type}-marque`]=val})
          // Habillement (page 6) — distribute tenue items across proper columns
          const habItems = { calot: [], veste: [], pantalon: [], manteau: [] }
          const equipFallback = []
          preset.tenue.forEach(item => {
            const lo = item.toLowerCase()
            if (lo.includes('mütze') || lo.includes('helm') || lo.includes('schirm') || lo.includes('calot') || lo.includes('tarnnetz')) habItems.calot.push(item)
            else if (lo.includes('bluse') || lo.includes('jacke') || lo.includes('splitter') || lo.includes('armbinde')) habItems.veste.push(item)
            else if (lo.includes('hose') || lo.includes('reit') || lo.includes('gamasche')) habItems.pantalon.push(item)
            else if (lo.includes('mantel') || lo.includes('zelt') || lo.includes('tarn')) habItems.manteau.push(item)
            else equipFallback.push(item) // equipment items → page 7 cells, NOT calot
          })
          equipFallback.forEach(item => {
            const lo = item.toLowerCase()
            if (lo.includes('stiefel') || lo.includes('schuhe')) nc['eq-botte-1'] = item
            else if (lo.includes('koppel') || lo.includes('riemen')) nc['eq-ceint-1'] = item
            else if (lo.includes('beutel') || lo.includes('tornister') || lo.includes('gepäck') || lo.includes('tasche') || lo.includes('affe')) nc['eq-sac-1'] = item
            else if (lo.includes('flasche')) nc['eq-gourde-1'] = item
            else if (lo.includes('geschirr')) nc['eq-gamelle-1'] = item
            else if (lo.includes('marke') || lo.includes('päckchen') || lo.includes('soldbuch')) nc['eq-divers-'+(Object.keys(nc).filter(k=>k.startsWith('eq-divers')).length+1)] = item
          })
          // Fill rows: each row = one item across the 4 columns
          const maxRows = Math.max(habItems.calot.length, habItems.veste.length, habItems.pantalon.length, habItems.manteau.length, 1)
          for (let i = 0; i < maxRows; i++) {
            if (habItems.calot[i]) nc[`tenue-${i+1}`] = habItems.calot[i]
            if (habItems.veste[i]) nc[`hab-veste-${i+1}`] = habItems.veste[i]
            if (habItems.pantalon[i]) nc[`hab-pant-${i+1}`] = habItems.pantalon[i]
            if (habItems.manteau[i]) nc[`hab-mant-${i+1}`] = habItems.manteau[i]
          }
          // Équipement (page 7) — map known items
          const eqMap = {}
          preset.tenue.forEach(item => {
            const lo = item.toLowerCase()
            if (lo.includes('stiefel') || lo.includes('schuhe') || lo.includes('gamasche')) eqMap['botte'] = item
            else if (lo.includes('brotbeutel') || lo.includes('tornister') || lo.includes('gepäck') || lo.includes('tasche') || lo.includes('affe')) eqMap['sac'] = item
            else if (lo.includes('koppel') || lo.includes('riemen')) eqMap['ceint'] = item
            else if (lo.includes('flasche')) eqMap['gourde'] = item
            else if (lo.includes('geschirr')) eqMap['gamelle'] = item
          })
          Object.entries(eqMap).forEach(([k,v])=>{nc[`eq-${k}-1`]=v})
          setCells(nc)
          // Save all to backend — deduplicate cellIds
          const saveMap = {}
          Object.entries(preset.equip).forEach(([type,val])=>{saveMap[`w8a-${type}-marque`]=val})
          for (let i = 0; i < maxRows; i++) {
            if (habItems.calot[i]) saveMap[`tenue-${i+1}`] = habItems.calot[i]
            if (habItems.veste[i]) saveMap[`hab-veste-${i+1}`] = habItems.veste[i]
            if (habItems.pantalon[i]) saveMap[`hab-pant-${i+1}`] = habItems.pantalon[i]
            if (habItems.manteau[i]) saveMap[`hab-mant-${i+1}`] = habItems.manteau[i]
          }
          Object.entries(eqMap).forEach(([k,v])=>{saveMap[`eq-${k}-1`]=v})
          const saves = Object.entries(saveMap).map(([cellId,value])=>api.put(`/soldbuch/${e.id}/book-cells`,{cellId,value}).catch(()=>{}))
          ev.target.value=''
        }}>
          <option value="">⚙️ Remplir par spécialité...</option>
          {Object.keys(EQUIP_PRESETS).map(k=><option key={k} value={k}>{k}</option>)}
        </select>
      </div>}
      <table className="sb-t">
        <thead><tr><th>Type</th><th>Marque</th><th>N° série</th><th>Reçu le</th><th>Sign.</th></tr></thead>
        <tbody>{W8A.map(w=><tr key={w}><td><strong style={{fontSize:'.38rem'}}>{w}</strong></td><td><EC id={`w8a-${w}-marque`} placeholder="marque"/></td><td><EC id={`w8a-${w}-serie`} placeholder="N°" serial/></td><td><EC id={`w8a-${w}-date`} placeholder="date"/></td><td>{NB}</td></tr>)}</tbody>
      </table>
      <PageNum n="8a"/>
      </div>{/* sb-land */}
    </div>
  </div>)

  /* 5: Page 8b | Page 9 */
  S.push(<div className="sb-spread" key="s5">
    <div className="sb-page sb-page-l">
      <h4 className="sb-center">Armes (suite)</h4>
      <table className="sb-t">
        <thead><tr><th>Type</th><th>Marque</th><th>N° série</th><th>Reçu le</th><th>Sign.</th></tr></thead>
        <tbody>{W8B.map(w=><tr key={w}><td><strong style={{fontSize:'.38rem'}}>{w}</strong></td><td><EC id={`w8b-${w}-marque`} placeholder="marque"/></td><td><EC id={`w8b-${w}-serie`} placeholder="N°" serial/></td><td><EC id={`w8b-${w}-date`} placeholder="date"/></td><td>{NB}</td></tr>)}<ER cols={5} n={5}/></tbody>
      </table>
      <PageNum n="8b"/>
    </div>
    <div className="sb-page sb-page-r">
      <h4 className="sb-center">Vaccinations</h4>
      {['a) Variole','b) Typhus','c) Dysenterie','d) Choléra','e) Autres'].map((v,i)=>{
        const typeMap={'a) Variole':'Variole','b) Typhus':'Typhus','c) Dysenterie':'Dysenterie','d) Choléra':['Cholera','Choléra'],'e) Autres':null}
        const match=typeMap[v]
        const vacc=vaccinations.filter(vc=>{
          if(!match) return !['Variole','Typhus','Dysenterie','Cholera','Choléra'].some(t=>vc.type_vaccin?.includes(t))
          if(Array.isArray(match)) return match.some(m=>vc.type_vaccin?.includes(m))
          return vc.type_vaccin?.includes(match)
        })
        const first=vacc[0]
        return <div key={i} className="sb-impf">
          <p className="sb-label">{v}</p>
          <table className="sb-t"><thead><tr><th>Le</th><th>1ère</th><th>2ème</th><th>3ème</th><th>Médecin</th></tr></thead><tbody><tr><td>{first?<Ink small>{fmtD(first.date_vaccination)}</Ink>:NB}</td><td>{first?<Ink small>✓</Ink>:NB}</td><td>{vacc[1]?<Ink small>✓</Ink>:NB}</td><td>{vacc[2]?<Ink small>✓</Ink>:NB}</td><td>{first?<Ink small>{first.medecin_nom||''}</Ink>:NB}</td></tr></tbody></table>
        </div>
      })}
      <div className="sb-spacer"/>
      <PageNum n={9}/>
    </div>
  </div>)

  /* 6: Page 10 | Page 11 */
  S.push(<div className="sb-spread" key="s6">
    <div className="sb-page sb-page-l">
      <h4 className="sb-center">Examen optique</h4>
      <table className="sb-t"><tbody><R l="Date de l'examen" v=""/><R l="N° monture" v=""/></tbody></table>
      <table className="sb-t">
        <thead><tr><th>{NB}</th><th>— Verre</th><th>+ Verre</th></tr></thead>
        <tbody><tr><td className="sb-lbl-cell">Œil droit</td><td>{NB}</td><td>{NB}</td></tr><tr><td className="sb-lbl-cell">Œil gauche</td><td>{NB}</td><td>{NB}</td></tr></tbody>
      </table>
      <div className="sb-spacer"/>
      <PageNum n={10}/>
    </div>
    <div className="sb-page sb-page-r">
      <p className="sb-label sb-center">Écart pupillaire</p>
      <table className="sb-t"><tbody><R l="Droit" v="mm"/><R l="Gauche" v="mm"/></tbody></table>
      <table className="sb-t">
        <thead><tr><th colSpan={2}>Cylindrique</th></tr></thead>
        <tbody><tr><td>Verre (BKE)</td><td>Axe (°)</td></tr><ER cols={2} n={4}/></tbody>
      </table>
      <div className="sb-spacer"/>
      <p className="sb-xs">BKE = Dioptrie</p>
      <PageNum n={11}/>
    </div>
  </div>)

  /* 7: Page 12 | Page 13 */
  S.push(<div className="sb-spread" key="s7">
    <div className="sb-page sb-page-l">
      <div className="sb-land">
      <h4 className="sb-center">Hospitalisations</h4>
      <table className="sb-t">
        <thead><tr><th>Hôpital</th><th>Entrée</th><th>Sortie</th><th>Motif</th></tr></thead>
        <tbody>
          {hospitalisations.slice(0,16).map((h,i)=><tr key={i}><td><Ink small>{h.etablissement}</Ink></td><td><Ink small>{fmtD(h.date_entree)}</Ink></td><td><Ink small>{fmtD(h.date_sortie)}</Ink></td><td><Ink small>{h.motif}</Ink></td></tr>)}
          <ER cols={4} n={Math.max(0,16-hospitalisations.length)}/>
        </tbody>
      </table>
      <PageNum n={12}/>
      </div>
    </div>
    <div className="sb-page sb-page-r">
      <div className="sb-land">
      <h4 className="sb-center">Blessures</h4>
      <table className="sb-t">
        <thead><tr><th>Date</th><th>Nature</th><th>Localisation</th><th>Gravité</th></tr></thead>
        <tbody>
          {blessures.slice(0,16).map((b,i)=><tr key={i}><td><Ink small>{fmtD(b.date_blessure)}</Ink></td><td><Ink small>{b.type_blessure}</Ink></td><td><Ink small>{b.localisation}</Ink></td><td><Ink small>{b.gravite}</Ink></td></tr>)}
          <ER cols={4} n={Math.max(0,16-blessures.length)}/>
        </tbody>
      </table>
      <PageNum n={13}/>
      </div>
    </div>
  </div>)

  /* 8: Page 14 | Page 15 */
  S.push(<div className="sb-spread" key="s8">
    <div className="sb-page sb-page-l">
      <h4 className="sb-center">Blessures (suite)</h4>
      <table className="sb-t">
        <thead><tr><th>Date</th><th>Nature</th><th>Hôpital</th><th>Médecin</th></tr></thead>
        <tbody><ER cols={4} n={18}/></tbody>
      </table>
      <PageNum n={14}/>
    </div>
    <div className="sb-page sb-page-r">
      <h4 className="sb-center">Effets confiés à l'hôpital</h4>
      <p className="sb-label sb-center">Argent, papiers, objets de valeur</p>
      <div className="sb-lined">{Array.from({length:20},(_,i)=><div key={i} className="sb-line"/>)}</div>
      <PageNum n={15}/>
    </div>
  </div>)

  /* 9: Page 16 | Page 17 */
  S.push(<div className="sb-spread" key="s9">
    <div className="sb-page sb-page-l">
      <h4 className="sb-center">Station dentaire</h4>
      <table className="sb-t"><tbody><R l="Station" v=""/><R l="Prothèse reçue le" v=""/></tbody></table>
      <p className="sb-sm sb-center">+ Manquantes &nbsp; ○ Remplacées</p>
      <table className="sb-t sb-teeth"><tbody>
        <tr><td>8 7 6 5 4 3 2 1</td><td>1 2 3 4 5 6 7 8</td></tr>
        <tr><td>8 7 6 5 4 3 2 1</td><td>1 2 3 4 5 6 7 8</td></tr>
      </tbody></table>
      <p className="sb-sm">Dentiste: _______ Médecin: _______</p>
      <div className="sb-spacer"/>
      <PageNum n={16}/>
    </div>
    <div className="sb-page sb-page-r">
      <div className="sb-land">
      <h4 className="sb-center">Suite de la page 4</h4>
      <p className="sb-label">B. Envoyé par :</p>
      <table className="sb-t">
        <thead><tr><th>{NB}</th><th>Unité</th><th>Cie</th><th>Registre</th></tr></thead>
        <tbody><ER cols={4} n={3}/></tbody>
      </table>
      <p className="sb-label">Unité de campagne :</p>
      <table className="sb-t">
        <thead><tr><th>{NB}</th><th>Unité</th><th>Cie</th><th>Registre</th></tr></thead>
        <tbody><ER cols={4} n={3}/></tbody>
      </table>
      <table className="sb-t"><thead><tr><th>Unité actuelle</th><th style={{width:'30%'}}>Garnison</th></tr></thead><tbody><ER cols={2} n={2}/></tbody></table>
      <PageNum n={17}/>
      </div>
    </div>
  </div>)

  /* 10: Page 18 | Page 19 — Solde (dynamique) */
  S.push(<div className="sb-spread" key="s10">
    <div className="sb-page sb-page-l">
      <div className="sb-land">
      <h4 className="sb-center">Solde (Wehrsold)</h4>
      <table className="sb-t">
        <thead><tr><th>Date</th><th>Motif</th><th style={{textAlign:'right'}}>RM</th></tr></thead>
        <tbody>
          {(soldeData||[]).slice(0,14).map((s,i)=><tr key={i}><td><Ink small>{fmtD(s.date_operation)}</Ink></td><td><Ink small>{s.motif}</Ink></td><td style={{textAlign:'right',color:s.type_operation==='debit'?'#8b0000':'inherit'}}><Ink small>{s.type_operation==='debit'?'-':''}{parseFloat(s.montant).toFixed(2)}</Ink></td></tr>)}
          {(!soldeData||soldeData.length===0)&&<ER cols={3} n={14}/>}
          {soldeData&&soldeData.length>0&&soldeData.length<14&&<ER cols={3} n={14-Math.min(soldeData.length,14)}/>}
        </tbody>
      </table>
      <PageNum n={18}/>
      </div>
    </div>
    <div className="sb-page sb-page-r">
      <div className="paper-card" style={{textAlign:'center',margin:'8px 0',padding:6,background:'rgba(75,83,32,0.06)',border:'1px solid var(--border)'}}>
        <div style={{fontSize:'.6rem',color:'var(--text-muted)'}}>Balance actuelle</div>
        <div style={{fontSize:'1rem',fontWeight:700,color:'var(--military-green)'}}>{(soldeBalance||0).toFixed(2)} RM</div>
      </div>
      <h4 className="sb-center" style={{marginTop:8}}>Solde de guerre</h4>
      <p className="sb-xs">Primes de combat, récompenses.</p>
      <div className="sb-lined">{Array.from({length:10},(_,i)=><div key={i} className="sb-line"/>)}</div>
      <PageNum n={19}/>
    </div>
  </div>)

  /* 11: Page 20 | Page 21 */
  S.push(<div className="sb-spread" key="s11">
    <div className="sb-page sb-page-l">
      <div className="sb-land">
      <p className="sb-xs">B. Montants versés par trésorerie étrangère.</p>
      <table className="sb-t">
        <thead><tr><th>Le</th><th>Période</th><th>Détails</th><th>RM</th><th>Rpf</th></tr></thead>
        <tbody><ER cols={5} n={16}/></tbody>
      </table>
      <PageNum n={20}/>
      </div>
    </div>
    <div className="sb-page sb-page-r">
      <h4 className="sb-center">Indemnité d'habillement</h4>
      <table className="sb-t"><tbody><R l="Montant RM" v=""/><R l="Date" v=""/><R l="Trésorier" v=""/></tbody></table>
      <div className="sb-spacer"/>
      <div className="sb-lined">{Array.from({length:12},(_,i)=><div key={i} className="sb-line"/>)}</div>
      <PageNum n={21}/>
    </div>
  </div>)

  /* 12: Page 22 | Page 23 */
  S.push(<div className="sb-spread" key="s12">
    <div className="sb-page sb-page-l">
      <div className="sb-land">
      <h4 className="sb-center">Décorations</h4>
      <table className="sb-t">
        <thead><tr><th>Date</th><th>Décoration</th><th>Brevet</th><th>Confirmation</th></tr></thead>
        <tbody>
          {decorations.map((d,i)=><tr key={i}><td><Ink small>{d.date_attribution}</Ink></td><td><Ink small>{d.decoration_nom||d.nom_custom}</Ink></td><td>{NB}</td><td>{NB}</td></tr>)}
          <ER cols={4} n={Math.max(3,14-decorations.length)}/>
        </tbody>
      </table>
      <PageNum n={22}/>
      </div>
    </div>
    <div className="sb-page sb-page-r">
      <h4 className="sb-center">Permissions (+5 jours)</h4>
      <p className="sb-xs sb-center">(À remplir avant le départ)</p>
      {[1,2,3,4].map(n=>{const p=permissions[n-1];return <div key={n} className="sb-urlaub">
        <table className="sb-t"><tbody><R l={`${n}. Du`} v={p?fmtD(p.date_debut):''}/><R4 a="au" b={p?fmtD(p.date_fin):''} c="vers" d=""/><R l="Motif" v={p?p.raison:''}/></tbody></table>
      </div>})}
      <div className="sb-spacer"/>
      <PageNum n={23}/>
    </div>
  </div>)

  /* 13: Page 24 | Couverture arrière */
  S.push(<div className="sb-spread" key="s13">
    <div className="sb-page sb-page-l">
      {[5,6,7,8].map(n=>{const p=permissions[n-1];return <div key={n} className="sb-urlaub">
        <table className="sb-t"><tbody><R l={`${n}. Du`} v={p?fmtD(p.date_debut):''}/><R4 a="au" b={p?fmtD(p.date_fin):''} c="vers" d=""/><R l="Motif" v={p?p.raison:''}/></tbody></table>
      </div>})}
      <div className="sb-spacer"/>
      <PageNum n={24}/>
    </div>
    <div className="sb-page sb-page-r sb-page-dark">
      <div className="sb-back-cover">
        <p>Les livrets de solde ne peuvent être obtenus que par le commandement compétent. Toute reproduction par des entreprises privées est strictement interdite.</p>
      </div>
    </div>
  </div>)

  return(
    <div className={`sb-wrapper sb-theme-${theme}${rotated?' sb-rotated':''}`}>
      {S[spread]}
      <div className="sb-nav">
        <button onClick={()=>setIsOpen(false)}>📕 Couverture</button>
        <button onClick={()=>setSpread(s=>Math.max(0,s-1))} disabled={spread===0}>◀</button>
        <span className="sb-nav-info">{spread===0?'Règl./P.1':`P.${spread*2}–${spread*2+1}`} ({spread+1}/{TOTAL})</span>
        <button onClick={()=>setSpread(s=>Math.min(TOTAL-1,s+1))} disabled={spread>=TOTAL-1}>▶</button>
        <button onClick={()=>setRotated(r=>!r)} title={rotated?'Vue normale':'Tourner le document'}>{rotated?'📖 Normal':'🔄 Tourner'}</button>
      </div>

      {/* Habillement Request Popup */}
      {habPopup && <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',zIndex:1001,display:'flex',justifyContent:'center',alignItems:'center',padding:10}} onClick={ev=>{if(ev.target===ev.currentTarget)setHabPopup(false)}}>
        <div className="paper-card" style={{maxWidth:450,width:'100%',padding:'var(--space-xl)',background:'#f5f0e1',boxShadow:'0 4px 20px rgba(0,0,0,0.3)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'var(--space-md)'}}>
            <h3 style={{margin:0,fontSize:'1rem'}}>📝 Demande d'habillement</h3>
            <button className="btn btn-secondary" onClick={()=>setHabPopup(false)} style={{fontSize:'.8rem'}}>✕</button>
          </div>
          <p style={{fontSize:'.8rem',color:'var(--text-muted)',margin:'0 0 var(--space-md)'}}>
            Décrivez l'équipement ou vêtement souhaité. Un officier devra valider votre demande.
          </p>
          {habMsg && <div className={`alert ${habMsg.startsWith('✓')?'alert-success':'alert-danger'}`} style={{marginBottom:'var(--space-sm)',fontSize:'.8rem'}}>{habMsg}</div>}
          <div className="form-group" style={{marginBottom:'var(--space-sm)'}}>
            <label style={{fontSize:'.8rem',fontWeight:600}}>Description de la demande *</label>
            <textarea className="form-input" rows={3} value={habDesc} onChange={ev=>setHabDesc(ev.target.value)} placeholder="Ex: Demande de nouvelle Feldbluse M43 (taille 2), la précédente est endommagée..." style={{fontSize:'.8rem',resize:'vertical'}}/>
          </div>
          <div className="form-group" style={{marginBottom:'var(--space-md)'}}>
            <label style={{fontSize:'.8rem',fontWeight:600}}>Motif / justification</label>
            <input type="text" className="form-input" value={habMotif} onChange={ev=>setHabMotif(ev.target.value)} placeholder="Ex: Usure au combat, promotion, changement d'affectation..." style={{fontSize:'.8rem'}}/>
          </div>
          <div style={{display:'flex',gap:'var(--space-sm)',justifyContent:'flex-end'}}>
            <button className="btn btn-secondary" onClick={()=>setHabPopup(false)}>Annuler</button>
            <button className="btn btn-primary" disabled={!habDesc.trim()||saving} onClick={async()=>{
              setSaving(true)
              try{
                await api.post('/habillement/demandes',{description:habDesc.trim(),motif:habMotif.trim()})
                setHabMsg('✓ Demande envoyée pour validation !')
                setHabDesc('');setHabMotif('')
                setTimeout(()=>{setHabPopup(false);setHabMsg('')},1500)
              }catch(err){setHabMsg(err.response?.data?.message||'Erreur lors de l\'envoi')}
              setSaving(false)
            }}>{saving?'Envoi...':'Envoyer la demande'}</button>
          </div>
        </div>
      </div>}

      {/* Signature Popup */}
      {sigPopup && <SignaturePopup
        onClose={() => setSigPopup(null)}
        onSign={handleSign}
        documentType="soldbuch"
        documentId={e.id}
        documentLabel={`Soldbuch de ${e.prenom} ${e.nom}`}
        slotLabel={sigPopup.slot === 'soldat' ? 'Signature du soldat' : 'Signature officier référent'}
        hideRequest={sigPopup.slot === 'soldat'}
      />}

      {/* Stamp Picker Modal */}
      {stampPicker && <div className="sb-modal-overlay" onClick={() => setStampPicker(false)}>
        <div className="sb-modal" onClick={ev => ev.stopPropagation()}>
          <h3>Sélectionner un tampon</h3>
          {tampons.length === 0 && <p>Aucun tampon dans la bibliothèque.</p>}
          <div className="sb-stamp-grid">
            {tampons.map(t => (
              <div key={t.id} className="sb-stamp-option" onClick={() => handleStamp(t.image_path || t.url)}>
                <img src={t.image_path || t.url} alt={t.nom || 'Tampon'}/>
                <span>{t.nom || `Tampon #${t.id}`}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={() => setStampPicker(false)} style={{marginTop:8}}>Annuler</button>
        </div>
      </div>}
    </div>
  )
}
