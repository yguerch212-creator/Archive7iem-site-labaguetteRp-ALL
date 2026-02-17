import React, { useState } from 'react'
import './soldbuch-book.css'

/* =============================================
   SoldbuchBook — Authentic WW2 Soldbuch Viewer
   Renders like a REAL filled-out Soldbuch
   Data appears as handwritten on pre-printed pages
   ============================================= */

// Denazified Wehrmacht eagle SVG (Balkenkreuz + instead of swastika)
function EagleSVG({ color = '#1a1a1a', size = 80 }) {
  return (
    <svg width={size} height={size * 0.65} viewBox="0 0 200 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M100 45 L5 20 Q0 18 2 22 L40 50 Q60 58 80 52 Z" fill={color} opacity="0.9"/>
      <path d="M100 45 L195 20 Q200 18 198 22 L160 50 Q140 58 120 52 Z" fill={color} opacity="0.9"/>
      <path d="M15 22 L45 35 M25 25 L50 40 M35 28 L58 42 M45 32 L65 45 M55 36 L72 47" stroke={color} strokeWidth="1.5" opacity="0.6"/>
      <path d="M185 22 L155 35 M175 25 L150 40 M165 28 L142 42 M155 32 L135 45 M145 36 L128 47" stroke={color} strokeWidth="1.5" opacity="0.6"/>
      <ellipse cx="100" cy="55" rx="18" ry="14" fill={color} opacity="0.85"/>
      <circle cx="100" cy="38" r="7" fill={color}/>
      <path d="M100 38 L105 43 L100 41 Z" fill={color}/>
      <circle cx="100" cy="85" r="22" stroke={color} strokeWidth="3" fill="none" opacity="0.7"/>
      <path d="M80 78 Q75 85 80 92" stroke={color} strokeWidth="2" fill="none" opacity="0.5"/>
      <path d="M83 75 Q77 83 83 95" stroke={color} strokeWidth="1.5" fill="none" opacity="0.4"/>
      <path d="M120 78 Q125 85 120 92" stroke={color} strokeWidth="2" fill="none" opacity="0.5"/>
      <path d="M117 75 Q123 83 117 95" stroke={color} strokeWidth="1.5" fill="none" opacity="0.4"/>
      <rect x="96" y="75" width="8" height="20" fill={color} opacity="0.8"/>
      <rect x="90" y="81" width="20" height="8" fill={color} opacity="0.8"/>
      <path d="M90 68 L88 80 M92 68 L90 78" stroke={color} strokeWidth="1.5"/>
      <path d="M110 68 L112 80 M108 68 L110 78" stroke={color} strokeWidth="1.5"/>
    </svg>
  )
}

function LuftwaffeEagleSVG({ color = '#1a1a1a', size = 80 }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M100 40 L2 10 Q-2 8 2 14 L50 45 Q70 52 85 48 Z" fill={color} opacity="0.9"/>
      <path d="M100 40 L198 10 Q202 8 198 14 L150 45 Q130 52 115 48 Z" fill={color} opacity="0.9"/>
      <path d="M10 12 L45 32 M20 15 L52 35 M30 18 L60 38 M42 22 L68 40" stroke={color} strokeWidth="1.2" opacity="0.5"/>
      <path d="M190 12 L155 32 M180 15 L148 35 M170 18 L140 38 M158 22 L132 40" stroke={color} strokeWidth="1.2" opacity="0.5"/>
      <ellipse cx="100" cy="50" rx="15" ry="12" fill={color} opacity="0.85"/>
      <circle cx="100" cy="35" r="6" fill={color}/>
      <path d="M100 35 L106 40 L100 38 Z" fill={color}/>
      <path d="M92 62 L90 75 M95 62 L93 73" stroke={color} strokeWidth="1.5"/>
      <path d="M108 62 L110 75 M105 62 L107 73" stroke={color} strokeWidth="1.5"/>
      <rect x="96" y="72" width="8" height="18" fill={color} opacity="0.8"/>
      <rect x="90" y="78" width="20" height="8" fill={color} opacity="0.8"/>
    </svg>
  )
}

// Handwritten-style value — appears as if written on the document
function Ink({ children, center }) {
  if (!children) return null
  return (
    <span className="sb-ink" style={center ? { textAlign: 'center', display: 'block' } : undefined}>
      {children}
    </span>
  )
}

// A printed label with a dotted line and handwritten value
function PrintedLine({ label, value, labelWidth }) {
  return (
    <div className="sb-printed-line">
      {label && <span className="sb-printed-label" style={labelWidth ? { minWidth: labelWidth } : undefined}>{label}</span>}
      <span className="sb-printed-value">{value ? <Ink>{value}</Ink> : ''}</span>
    </div>
  )
}

function getTheme(uniteCode) {
  if (!uniteCode) return 'heer'
  const c = String(uniteCode).toLowerCase()
  if (c === '009') return 'luftwaffe'
  if (c === '254') return 'feld'
  if (c === '130') return 'panzer'
  if (c === '916s') return 'sanit'
  if (c === '001') return 'marine'
  return 'heer'
}

function getCoverSubtitle(theme) {
  if (theme === 'luftwaffe') return 'Luftwaffe'
  if (theme === 'marine') return 'Kriegsmarine'
  return null
}

// 10 Commandements
const COMMANDEMENTS = [
  "Le soldat allemand combat avec chevalerie. Il lutte pour la victoire de son peuple. Les actes de cruaute et la destruction inutile sont indignes de lui.",
  "Le combattant doit etre en uniforme ou porter un insigne distinctif, specialement retroussi et bien visible. Se battre en civil sans un tel insigne est interdit.",
  "Aucun ennemi ne doit etre tue s'il se rend, pas meme les franc-tireurs et les espions. Les voleurs recoivent leur juste chatiment devant les tribunaux.",
  "Les prisonniers de guerre ne doivent ni etre maltraites ni insultes. Toutes armes, plans et documents doivent etre confisques. Aucun autre bien personnel ne doit leur etre retire.",
  "Les balles Dum-Dum sont interdites. Il est egalement interdit de modifier des projectiles pour les transformer en balles Dum-Dum.",
  "La Croix-Rouge est inviolable. Les ennemis blesses doivent etre traites humainement. Le personnel medical et les aumoniers ne doivent pas etre empeches de remplir leur mission.",
  "La population civile est inviolable. Le soldat ne doit ni piller ni detruire gratuitement. Les monuments historiques et les batiments religieux, culturels, scientifiques ou charitables doivent etre respectes.",
  "Les territoires neutres ne doivent en aucun cas etre impliques dans les operations militaires.",
  "Si un soldat allemand est fait prisonnier, il doit, en cas d'interrogatoire, declarer son nom et son grade. En aucun cas il ne doit reveler son unite d'appartenance ni donner d'informations militaires.",
  "Les infractions aux ordres ci-dessus en matiere de service sont punissables. Les violations des principes 1 a 8 par l'ennemi doivent etre signalees."
]

export default function SoldbuchBook({ effectif, decorations = [] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentSpread, setCurrentSpread] = useState(0)

  const e = effectif
  const theme = getTheme(e.unite_code)
  const coverSubtitle = getCoverSubtitle(theme)
  const isLuftwaffe = theme === 'luftwaffe'
  const totalSpreads = 3

  // ==================== COVER ====================
  if (!isOpen) {
    return (
      <div className={`soldbuch-book-wrapper soldbuch-theme-${theme}`}>
        <div className="soldbuch-cover" onClick={() => setIsOpen(true)}>
          <span className="cover-name">{e.nom}</span>
          <div className="cover-border">
            <div className="cover-eagle">
              {isLuftwaffe
                ? <LuftwaffeEagleSVG color="currentColor" size={90} />
                : <EagleSVG color="currentColor" size={90} />}
            </div>
            <div className="cover-title">Soldbuch</div>
            <div className="cover-subtitle">zugleich Personalausweis</div>
            {coverSubtitle && <div className="cover-regiment">{coverSubtitle}</div>}
          </div>
          <div className="cover-hint">Cliquer pour ouvrir</div>
        </div>
      </div>
    )
  }

  // ==================== OPEN BOOK ====================
  return (
    <div className={`soldbuch-book-wrapper soldbuch-theme-${theme}`}>
      <div className="soldbuch-book">
        <div className="soldbuch-spread">

          {/* ========== SPREAD 0: 10 Commandements + Page 1 ========== */}
          {currentSpread === 0 && (<>
            {/* LEFT — 10 Commandements */}
            <div className="soldbuch-page soldbuch-page-left soldbuch-page-gebote">
              <div className="sb-gebote">
                <h3>10 Commandements</h3>
                <h4>pour la conduite du soldat en temps de guerre</h4>
                <ol>
                  {COMMANDEMENTS.map((g, i) => <li key={i}>{g}</li>)}
                </ol>
                <div style={{ marginTop: '0.5rem', fontSize: '0.5rem', opacity: 0.4 }}>
                  W.N.3. 11/III. 4. 1000. 4/1901.
                </div>
              </div>
            </div>

            {/* RIGHT — Page 1: Identity (like a real filled soldbuch) */}
            <div className="soldbuch-page soldbuch-page-right">
              <div className="sb-page1">
                {/* Header */}
                <div className="sb-page1-header">
                  <span className="sb-page1-title">Soldbuch</span>
                  <span className="sb-page1-sub">et carte d'identite</span>
                </div>

                {/* Nr */}
                <div className="sb-nr-line">
                  <span className="sb-printed-label">Nr.</span>
                  <span className="sb-nr-box"><Ink>{e.id}</Ink></span>
                </div>

                <div className="sb-center-label">pour</div>

                {/* Grade line */}
                <PrintedLine label="le" value={e.grade_nom} />
                <div className="sb-center-small">(rang)</div>

                {/* Promotion box */}
                <div className="sb-promo-box">
                  <div className="sb-promo-header">
                    <span></span>
                    <span className="sb-promo-col-label">(Date)</span>
                    <span className="sb-promo-col-label">(nouveau grade)</span>
                  </div>
                  <div className="sb-promo-entry">
                    <span className="sb-printed-label">le</span>
                    <span className="sb-printed-value"><Ink>{e.date_entree_ig}</Ink></span>
                    <span className="sb-printed-value"><Ink>{e.grade_nom}</Ink></span>
                  </div>
                  <div className="sb-promo-entry">
                    <span className="sb-printed-label">le</span>
                    <span className="sb-printed-value"></span>
                    <span className="sb-printed-value"></span>
                  </div>
                  <div className="sb-promo-entry">
                    <span className="sb-printed-label">le</span>
                    <span className="sb-printed-value"></span>
                    <span className="sb-printed-value"></span>
                  </div>
                </div>

                {/* Name — big, centered, like real */}
                <div className="sb-name-line">
                  <Ink center>{e.prenom} {e.nom}</Ink>
                </div>
                <div className="sb-center-small">(Prenom et nom)</div>

                {/* Bottom fields */}
                <div className="sb-bottom-fields">
                  <PrintedLine label="Plaque d'identite" value={e.numero_service || ''} />
                  <PrintedLine label="Groupe sanguin" value={e.blutgruppe || ''} />
                  <PrintedLine label="Taille du masque" value={e.gasmaskengroesse || ''} />
                  <PrintedLine label="Numero de service" value={e.wehrnummer || ''} />
                </div>
              </div>
              <div className="page-number">1</div>
            </div>
          </>)}

          {/* ========== SPREAD 1: Page 2 (Description) + Page 3 (Photo + Affectation) ========== */}
          {currentSpread === 1 && (<>
            {/* LEFT — Page 2: Personalbeschreibung */}
            <div className="soldbuch-page soldbuch-page-left">
              <div className="sb-page2">
                {/* Birth */}
                <div className="sb-row-2col">
                  <PrintedLine label="Ne le" value={e.date_naissance} />
                  <PrintedLine label="a" value={e.lieu_naissance} />
                </div>
                <div className="sb-center-small" style={{ textAlign: 'right' }}>(Lieu, district)</div>

                <div className="sb-thin-divider" />

                <div className="sb-row-2col">
                  <PrintedLine label="Religion" value={e.religion} />
                  <PrintedLine label="Profession" value={e.beruf} />
                </div>

                {/* Personalbeschreibung */}
                <div className="sb-section-header">Description personnelle :</div>

                <div className="sb-row-2col">
                  <PrintedLine label="Taille" value={e.taille_cm ? `${e.taille_cm} cm` : ''} />
                  <PrintedLine label="Corpulence" value={e.gestalt} />
                </div>
                <div className="sb-row-2col">
                  <PrintedLine label="Visage" value={e.gesicht} />
                  <PrintedLine label="Cheveux" value={e.haar} />
                </div>
                <div className="sb-row-2col">
                  <PrintedLine label="Barbe" value={e.bart} />
                  <PrintedLine label="Yeux" value={e.augen} />
                </div>

                <div style={{ marginTop: '0.6rem' }}>
                  <div className="sb-printed-label-block">Signes particuliers</div>
                  <div className="sb-printed-label-block">(ex. porteur de lunettes) :</div>
                  <div className="sb-printed-value sb-full-line">
                    <Ink>{e.besondere_kennzeichen}</Ink>
                  </div>
                </div>

                <div className="sb-row-2col" style={{ marginTop: '0.6rem' }}>
                  <PrintedLine label="Pointure" value={e.schuhzeuglaenge} />
                </div>

                {/* Signature of holder */}
                <div className="sb-holder-signature">
                  <div className="sb-sig-box">
                    {e.signature_soldat && <img src={e.signature_soldat} alt="" />}
                  </div>
                  <div className="sb-center-small">(Prenom et nom, signature du titulaire)</div>
                </div>

                <div className="sb-thin-divider" />

                <div className="sb-certification-text">
                  L'exactitude des informations non modifiees des pages 1 et 2 ainsi que
                  la signature manuscrite du titulaire sont certifiees
                </div>

                <PrintedLine label="le" value={e.date_entree_ig} />
                <div className="sb-center-small">(Unite emettrice)</div>

                {/* Stamp + officer signature */}
                <div className="sb-stamp-row">
                  <div className="sb-stamp-area">
                    <span className="sb-printed-label-block">Tampon</span>
                    {e.stamp_path && <img src={e.stamp_path} alt="" className="sb-stamp-img" />}
                  </div>
                  <div className="sb-officer-sig">
                    <div className="sb-sig-box sb-sig-small">
                      {e.signature_referent && <img src={e.signature_referent} alt="" />}
                    </div>
                  </div>
                </div>
              </div>
              <div className="page-number">2</div>
            </div>

            {/* RIGHT — Page 3: Photo + Affectation */}
            <div className="soldbuch-page soldbuch-page-right">
              <div className="sb-page3">
                {/* Photo — centered, like pasted on */}
                <div className="sb-photo-frame">
                  {e.photo
                    ? <img src={e.photo} alt="" />
                    : <div className="sb-photo-empty">Photo<br/>du titulaire</div>
                  }
                </div>

                <div className="sb-section-header">Affectation</div>

                <PrintedLine label="Unite" value={`${e.unite_code || ''} ${e.unite_nom || ''}`.trim()} />
                <PrintedLine label="Grade" value={e.grade_nom} />
                <PrintedLine label="Fonction" value={e.fonction} />
                <PrintedLine label="Specialite" value={e.specialite} />
                <PrintedLine label="Entree (RP)" value={e.date_entree_ig} />
                <PrintedLine label="Entree (IRL)" value={e.date_entree_irl} />

                <div className="sb-section-header" style={{ marginTop: '1.2rem' }}>Equipement</div>

                <PrintedLine label="Arme principale" value={e.arme_principale} />
                <PrintedLine label="Arme secondaire" value={e.arme_secondaire} />
                <PrintedLine label="Equipement special" value={e.equipement_special} />
                <PrintedLine label="Tenue" value={e.tenue} />
              </div>
              <div className="page-number">3</div>
            </div>
          </>)}

          {/* ========== SPREAD 2: Page 4 (Historique) + Page 5 (Decorations) ========== */}
          {currentSpread === 2 && (<>
            {/* LEFT — Page 4: Parcours */}
            <div className="soldbuch-page soldbuch-page-left">
              <div className="sb-section-header">Parcours de service</div>
              <div className="sb-historique">
                <Ink>{e.historique || ''}</Ink>
              </div>
              {!e.historique && (
                <div className="sb-empty-page">
                  {/* Empty lined area like a real blank page */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="sb-empty-line" />
                  ))}
                </div>
              )}
              <div className="page-number">4</div>
            </div>

            {/* RIGHT — Page 5: Decorations */}
            <div className="soldbuch-page soldbuch-page-right">
              <div className="sb-section-header">Decorations</div>

              {decorations.length > 0 ? (
                <div className="sb-deco-list">
                  {decorations.map((d, i) => (
                    <div key={d.id || i} className="sb-deco-entry">
                      <div className="sb-deco-name">
                        <Ink>{d.decoration_nom || d.nom_custom}</Ink>
                        {d.nom_allemand && <span className="sb-deco-german">({d.nom_allemand})</span>}
                      </div>
                      {(d.date_attribution || d.attribue_par) && (
                        <div className="sb-deco-meta">
                          <Ink>
                            {d.date_attribution}{d.attribue_par ? ` — decerne par ${d.attribue_par}` : ''}
                          </Ink>
                        </div>
                      )}
                      {d.motif && <div className="sb-deco-motif"><Ink>"{d.motif}"</Ink></div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sb-empty-page">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="sb-empty-line" />
                  ))}
                </div>
              )}
              <div className="page-number">5</div>
            </div>
          </>)}

        </div>
      </div>

      {/* Navigation */}
      <div className="soldbuch-nav">
        <button onClick={() => setIsOpen(false)}>📕 Couverture</button>
        <button onClick={() => setCurrentSpread(s => s - 1)} disabled={currentSpread === 0}>◀ Precedent</button>
        <span style={{ fontFamily: 'Courier New', fontSize: '0.8rem', opacity: 0.5, padding: '0.4rem' }}>
          {currentSpread * 2 + 1}–{currentSpread * 2 + 2} / {totalSpreads * 2}
        </span>
        <button onClick={() => setCurrentSpread(s => s + 1)} disabled={currentSpread >= totalSpreads - 1}>Suivant ▶</button>
      </div>
    </div>
  )
}
