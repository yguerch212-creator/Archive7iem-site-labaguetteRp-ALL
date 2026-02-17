import React, { useState } from 'react'
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

export default function SoldbuchBook({effectif,decorations=[]}){
  const[isOpen,setIsOpen]=useState(false)
  const[spread,setSpread]=useState(0)
  const e=effectif, theme=getTheme(e.unite_code), isLw=theme==='luftwaffe'
  const branch={luftwaffe:'Luftwaffe',marine:'Kriegsmarine'}[theme]||null
  const TOTAL=14

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
      <h3 className="sb-center sb-u">À lire attentivement !</h3>
      <h4 className="sb-center">Règlement</h4>
      <ol className="sb-rules">{REGLES.map((r,i)=><li key={i}>{r}</li>)}</ol>
      <div className="sb-spacer"/>
    </div>
    <div className="sb-page sb-page-r">
      <h3 className="sb-center" style={{letterSpacing:3}}>Soldbuch</h3>
      <p className="sb-center sb-sm">Livret de solde et pièce d'identité</p>
      <table className="sb-t"><tbody><tr><td className="sb-lbl-cell">N°</td><td className="sb-val-cell sb-center"><Ink>{e.id}</Ink></td></tr></tbody></table>
      <p className="sb-center sb-label">pour</p>
      <table className="sb-t"><tbody><R l="le" v={e.grade_nom}/></tbody></table>
      <p className="sb-center sb-xs">(Grade)</p>
      <table className="sb-t">
        <thead><tr><th>Date</th><th>Nouveau grade</th></tr></thead>
        <tbody><tr><td><Ink small>{e.date_entree_ig}</Ink></td><td><Ink small>{e.grade_nom}</Ink></td></tr><ER cols={2} n={2}/></tbody>
      </table>
      <table className="sb-t"><tbody><R l="" v={`${e.prenom||''} ${e.nom||''}`}/></tbody></table>
      <p className="sb-center sb-xs">(Prénom et nom)</p>
      <div className="sb-spacer"/>
      <table className="sb-t"><tbody>
        <R l="Plaque d'identité" v={e.numero_service}/>
        <R l="Groupe sanguin" v={e.blutgruppe}/>
        <R l="Masque à gaz" v={e.gasmaskengroesse}/>
        <R l="Matricule" v={genWehr(e)}/>
      </tbody></table>
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
      <div className="sb-sig-area">
        <div className="sb-sig-box">{e.signature_soldat&&<img src={e.signature_soldat} alt=""/>}</div>
        <p className="sb-xs">(Signature du détenteur)</p>
      </div>
      <div className="sb-stamp-row">
        <div>{e.stamp_path&&<img src={e.stamp_path} alt="" className="sb-stamp-img"/>}</div>
        <div className="sb-sig-area"><div className="sb-sig-box sb-sig-sm">{e.signature_referent&&<img src={e.signature_referent} alt=""/>}</div></div>
      </div>
      <PageNum n={2}/>
    </div>
    <div className="sb-page sb-page-r">
      <h4 className="sb-center">Attestations</h4>
      <p className="sb-center sb-xs">Modifications aux pages 1 et 2</p>
      <table className="sb-t">
        <thead><tr><th>N°</th><th>Modification</th><th>Page</th><th>Date</th><th>Signature</th></tr></thead>
        <tbody><ER cols={5} n={18}/></tbody>
      </table>
      <PageNum n={3}/>
    </div>
  </div>)

  /* 2: Page 4 | Page 5 */
  S.push(<div className="sb-spread" key="s2">
    <div className="sb-page sb-page-l">
      <table className="sb-t"><tbody><R l="A. Bureau de recrutement" v=""/></tbody></table>
      <p className="sb-label">B. Envoyé à l'armée par :</p>
      <table className="sb-t">
        <colgroup><col style={{width:'8%'}}/><col/><col style={{width:'14%'}}/><col style={{width:'18%'}}/></colgroup>
        <thead><tr><th>{NB}</th><th>Unité de remplacement</th><th>Cie</th><th>N° registre</th></tr></thead>
        <tbody><tr><td>a</td><td><Ink small>{`${e.unite_code||''} ${e.unite_nom||''}`.trim()}</Ink></td><td>{NB}</td><td>{NB}</td></tr><tr><td>b</td><td>{NB}</td><td>{NB}</td><td>{NB}</td></tr><tr><td>c</td><td>{NB}</td><td>{NB}</td><td>{NB}</td></tr></tbody>
      </table>
      <p className="sb-label">C. Unité de campagne :</p>
      <table className="sb-t">
        <colgroup><col style={{width:'8%'}}/><col/><col style={{width:'14%'}}/><col style={{width:'18%'}}/></colgroup>
        <thead><tr><th>{NB}</th><th>Unité de campagne</th><th>Cie</th><th>N° guerre</th></tr></thead>
        <tbody><ER cols={4} n={3}/></tbody>
      </table>
      <p className="sb-label">D.</p>
      <table className="sb-t">
        <thead><tr><th>Unité actuelle</th><th style={{width:'30%'}}>Garnison</th></tr></thead>
        <tbody><ER cols={2} n={2}/></tbody>
      </table>
      <div className="sb-spacer"/>
      <p className="sb-sm">→ Suite page 17.</p>
      <PageNum n={4}/>
    </div>
    <div className="sb-page sb-page-r">
      <h4 className="sb-center">Adresses des proches</h4>
      <table className="sb-t"><tbody><R l="de" v={`${e.prenom||''} ${e.nom||''}`}/></tbody></table>
      <p className="sb-label">1. Épouse</p>
      <table className="sb-t"><tbody><R l="Nom" v=""/><R l="Domicile" v=""/><R l="Rue" v=""/></tbody></table>
      <p className="sb-label">2. Parents</p>
      <table className="sb-t"><tbody><R l="Père" v=""/><R l="Profession" v=""/><R l="Mère" v=""/><R l="Domicile" v=""/><R l="Rue" v=""/></tbody></table>
      <p className="sb-label">3. Autre proche*</p>
      <table className="sb-t"><tbody><R l="Nom" v=""/><R l="Profession" v=""/><R l="Domicile" v=""/><R l="Rue" v=""/></tbody></table>
      <div className="sb-spacer"/>
      <p className="sb-xs">* Seulement si 1 et 2 non remplis.</p>
      <PageNum n={5}/>
    </div>
  </div>)

  /* 3: Page 6 | Page 7 */
  S.push(<div className="sb-spread" key="s3">
    <div className="sb-page sb-page-l">
      <h4 className="sb-center">Habillement</h4>
      <table className="sb-t sb-t-grid">
        <thead><tr><th>N°</th><th>Unité</th><th>Calot</th><th>Veste</th><th>Pantalon</th><th>Manteau</th></tr></thead>
        <tbody>{Array.from({length:12},(_,i)=><tr key={i}><td>{i+1}</td><td>{NB}</td><td>{NB}</td><td>{NB}</td><td>{NB}</td><td>{NB}</td></tr>)}</tbody>
      </table>
      <PageNum n={6}/>
    </div>
    <div className="sb-page sb-page-r">
      <h4 className="sb-center">Équipement</h4>
      <table className="sb-t sb-t-grid">
        <thead><tr><th>Bottes</th><th>Casque</th><th>Sac</th><th>Ceint.</th><th>Gourde</th><th>Date</th></tr></thead>
        <tbody><ER cols={6} n={12}/></tbody>
      </table>
      <PageNum n={7}/>
    </div>
  </div>)

  /* 4: Page 8 | Page 8a */
  S.push(<div className="sb-spread" key="s4">
    <div className="sb-page sb-page-l">
      <h4 className="sb-center">Remarques habillement</h4>
      <p className="sb-xs sb-center">(Échanges, demandes spéciales)</p>
      <div className="sb-lined">{Array.from({length:20},(_,i)=><div key={i} className="sb-line"/>)}</div>
      <PageNum n={8}/>
    </div>
    <div className="sb-page sb-page-r">
      <h4 className="sb-center">Armes et matériel</h4>
      <table className="sb-t">
        <thead><tr><th>Type</th><th>Marque</th><th>N° série</th><th>Reçu le</th><th>Sign.</th></tr></thead>
        <tbody>{W8A.map(w=><tr key={w}><td><strong style={{fontSize:'.38rem'}}>{w}</strong></td><td>{NB}</td><td>{NB}</td><td>{NB}</td><td>{NB}</td></tr>)}</tbody>
      </table>
      <PageNum n="8a"/>
    </div>
  </div>)

  /* 5: Page 8b | Page 9 */
  S.push(<div className="sb-spread" key="s5">
    <div className="sb-page sb-page-l">
      <h4 className="sb-center">Armes (suite)</h4>
      <table className="sb-t">
        <thead><tr><th>Type</th><th>Marque</th><th>N° série</th><th>Reçu le</th><th>Sign.</th></tr></thead>
        <tbody>{W8B.map(w=><tr key={w}><td><strong style={{fontSize:'.38rem'}}>{w}</strong></td><td>{NB}</td><td>{NB}</td><td>{NB}</td><td>{NB}</td></tr>)}<ER cols={5} n={5}/></tbody>
      </table>
      <PageNum n="8b"/>
    </div>
    <div className="sb-page sb-page-r">
      <h4 className="sb-center">Vaccinations</h4>
      {['a) Variole','b) Typhus','c) Dysenterie','d) Choléra','e) Autres'].map((v,i)=>(
        <div key={i} className="sb-impf">
          <p className="sb-label">{v}</p>
          <table className="sb-t"><thead><tr><th>Le</th><th>1ère</th><th>2ème</th><th>3ème</th><th>Médecin</th></tr></thead><tbody><tr><td>{NB}</td><td>{NB}</td><td>{NB}</td><td>{NB}</td><td>{NB}</td></tr></tbody></table>
        </div>
      ))}
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
      <h4 className="sb-center">Hospitalisations</h4>
      <table className="sb-t">
        <thead><tr><th>Hôpital</th><th>Jour</th><th>Année</th><th>Maladie</th></tr></thead>
        <tbody><ER cols={4} n={18}/></tbody>
      </table>
      <PageNum n={12}/>
    </div>
    <div className="sb-page sb-page-r">
      <h4 className="sb-center">Blessures</h4>
      <table className="sb-t">
        <thead><tr><th>Date</th><th>Nature</th><th>Hôpital</th><th>Médecin</th></tr></thead>
        <tbody><ER cols={4} n={18}/></tbody>
      </table>
      <PageNum n={13}/>
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
      <h4 className="sb-center">Suite de la page 4</h4>
      <p className="sb-label">B. Envoyé par :</p>
      <table className="sb-t">
        <colgroup><col style={{width:'8%'}}/><col/><col style={{width:'14%'}}/><col style={{width:'18%'}}/></colgroup>
        <thead><tr><th>{NB}</th><th>Unité</th><th>Cie</th><th>Registre</th></tr></thead>
        <tbody><ER cols={4} n={3}/></tbody>
      </table>
      <p className="sb-label">Unité de campagne :</p>
      <table className="sb-t">
        <colgroup><col style={{width:'8%'}}/><col/><col style={{width:'14%'}}/><col style={{width:'18%'}}/></colgroup>
        <thead><tr><th>{NB}</th><th>Unité</th><th>Cie</th><th>Registre</th></tr></thead>
        <tbody><ER cols={4} n={3}/></tbody>
      </table>
      <table className="sb-t"><thead><tr><th>Unité actuelle</th><th style={{width:'30%'}}>Garnison</th></tr></thead><tbody><ER cols={2} n={2}/></tbody></table>
      <div className="sb-spacer"/>
      <PageNum n={17}/>
    </div>
  </div>)

  /* 10: Page 18 | Page 19 */
  S.push(<div className="sb-spread" key="s10">
    <div className="sb-page sb-page-l">
      <h4 className="sb-center">Solde</h4>
      <p className="sb-xs">A. Par la trésorerie compétente.</p>
      <table className="sb-t">
        <thead><tr><th>Valable dès</th><th>Groupe</th><th>Trésorerie</th></tr></thead>
        <tbody><ER cols={3} n={10}/></tbody>
      </table>
      <PageNum n={18}/>
    </div>
    <div className="sb-page sb-page-r">
      <table className="sb-t"><thead><tr><th>Valable dès</th><th>Solde groupe</th><th>Trésorerie</th></tr></thead><tbody><ER cols={3} n={4}/></tbody></table>
      <h4 className="sb-center" style={{marginTop:8}}>Solde de guerre</h4>
      <div className="sb-lined">{Array.from({length:12},(_,i)=><div key={i} className="sb-line"/>)}</div>
      <PageNum n={19}/>
    </div>
  </div>)

  /* 11: Page 20 | Page 21 */
  S.push(<div className="sb-spread" key="s11">
    <div className="sb-page sb-page-l">
      <p className="sb-xs">B. Montants versés par trésorerie étrangère.</p>
      <table className="sb-t">
        <thead><tr><th>Le</th><th>Période</th><th>Détails</th><th>RM</th><th>Rpf</th></tr></thead>
        <tbody><ER cols={5} n={16}/></tbody>
      </table>
      <PageNum n={20}/>
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
    <div className="sb-page sb-page-r">
      <h4 className="sb-center">Permissions (+5 jours)</h4>
      <p className="sb-xs sb-center">(À remplir avant le départ)</p>
      {[1,2,3,4].map(n=><div key={n} className="sb-urlaub">
        <table className="sb-t"><tbody><R l={`${n}. Du`} v=""/><R4 a="au" b="" c="vers" d=""/><R l="Motif" v=""/></tbody></table>
      </div>)}
      <div className="sb-spacer"/>
      <PageNum n={23}/>
    </div>
  </div>)

  /* 13: Page 24 | Couverture arrière */
  S.push(<div className="sb-spread" key="s13">
    <div className="sb-page sb-page-l">
      {[5,6,7,8].map(n=><div key={n} className="sb-urlaub">
        <table className="sb-t"><tbody><R l={`${n}. Du`} v=""/><R4 a="au" b="" c="vers" d=""/><R l="Motif" v=""/></tbody></table>
      </div>)}
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
    <div className={`sb-wrapper sb-theme-${theme}`}>
      {S[spread]}
      <div className="sb-nav">
        <button onClick={()=>setIsOpen(false)}>📕 Couverture</button>
        <button onClick={()=>setSpread(s=>Math.max(0,s-1))} disabled={spread===0}>◀</button>
        <span className="sb-nav-info">{spread===0?'Règl./P.1':`P.${spread*2}–${spread*2+1}`} ({spread+1}/{TOTAL})</span>
        <button onClick={()=>setSpread(s=>Math.min(TOTAL-1,s+1))} disabled={spread>=TOTAL-1}>▶</button>
      </div>
    </div>
  )
}
