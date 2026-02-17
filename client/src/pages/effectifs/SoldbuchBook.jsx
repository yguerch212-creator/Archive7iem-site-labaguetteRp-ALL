import React, { useState } from 'react'
import './soldbuch-book.css'

/* =============================================
   SoldbuchBook — Authentic WW2 Soldbuch Viewer
   Per-regiment templates, page-flip, denazified
   ============================================= */

// Denazified Wehrmacht eagle SVG (Balkenkreuz + instead of swastika)
function EagleSVG({ color = '#1a1a1a', size = 80 }) {
  return (
    <svg width={size} height={size * 0.65} viewBox="0 0 200 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wings */}
      <path d="M100 45 L5 20 Q0 18 2 22 L40 50 Q60 58 80 52 Z" fill={color} opacity="0.9"/>
      <path d="M100 45 L195 20 Q200 18 198 22 L160 50 Q140 58 120 52 Z" fill={color} opacity="0.9"/>
      {/* Wing feathers left */}
      <path d="M15 22 L45 35 M25 25 L50 40 M35 28 L58 42 M45 32 L65 45 M55 36 L72 47" stroke={color} strokeWidth="1.5" opacity="0.6"/>
      {/* Wing feathers right */}
      <path d="M185 22 L155 35 M175 25 L150 40 M165 28 L142 42 M155 32 L135 45 M145 36 L128 47" stroke={color} strokeWidth="1.5" opacity="0.6"/>
      {/* Body */}
      <ellipse cx="100" cy="55" rx="18" ry="14" fill={color} opacity="0.85"/>
      {/* Head */}
      <circle cx="100" cy="38" r="7" fill={color}/>
      {/* Beak */}
      <path d="M100 38 L105 43 L100 41 Z" fill={color}/>
      {/* Wreath circle */}
      <circle cx="100" cy="85" r="22" stroke={color} strokeWidth="3" fill="none" opacity="0.7"/>
      {/* Laurel leaves left */}
      <path d="M80 78 Q75 85 80 92" stroke={color} strokeWidth="2" fill="none" opacity="0.5"/>
      <path d="M83 75 Q77 83 83 95" stroke={color} strokeWidth="1.5" fill="none" opacity="0.4"/>
      {/* Laurel leaves right */}
      <path d="M120 78 Q125 85 120 92" stroke={color} strokeWidth="2" fill="none" opacity="0.5"/>
      <path d="M117 75 Q123 83 117 95" stroke={color} strokeWidth="1.5" fill="none" opacity="0.4"/>
      {/* Balkenkreuz (Iron Cross / +) instead of swastika */}
      <rect x="96" y="75" width="8" height="20" fill={color} opacity="0.8"/>
      <rect x="90" y="81" width="20" height="8" fill={color} opacity="0.8"/>
      {/* Talons */}
      <path d="M90 68 L88 80 M92 68 L90 78" stroke={color} strokeWidth="1.5"/>
      <path d="M110 68 L112 80 M108 68 L110 78" stroke={color} strokeWidth="1.5"/>
    </svg>
  )
}

// Luftwaffe eagle (different pose — diving eagle)
function LuftwaffeEagleSVG({ color = '#1a1a1a', size = 80 }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wings spread wide */}
      <path d="M100 40 L2 10 Q-2 8 2 14 L50 45 Q70 52 85 48 Z" fill={color} opacity="0.9"/>
      <path d="M100 40 L198 10 Q202 8 198 14 L150 45 Q130 52 115 48 Z" fill={color} opacity="0.9"/>
      {/* Feather details */}
      <path d="M10 12 L45 32 M20 15 L52 35 M30 18 L60 38 M42 22 L68 40" stroke={color} strokeWidth="1.2" opacity="0.5"/>
      <path d="M190 12 L155 32 M180 15 L148 35 M170 18 L140 38 M158 22 L132 40" stroke={color} strokeWidth="1.2" opacity="0.5"/>
      {/* Body */}
      <ellipse cx="100" cy="50" rx="15" ry="12" fill={color} opacity="0.85"/>
      {/* Head */}
      <circle cx="100" cy="35" r="6" fill={color}/>
      <path d="M100 35 L106 40 L100 38 Z" fill={color}/>
      {/* Talons gripping + */}
      <path d="M92 62 L90 75 M95 62 L93 73" stroke={color} strokeWidth="1.5"/>
      <path d="M108 62 L110 75 M105 62 L107 73" stroke={color} strokeWidth="1.5"/>
      {/* Balkenkreuz below */}
      <rect x="96" y="72" width="8" height="18" fill={color} opacity="0.8"/>
      <rect x="90" y="78" width="20" height="8" fill={color} opacity="0.8"/>
    </svg>
  )
}

// Regiment theme mapping
function getTheme(uniteCode) {
  if (!uniteCode) return 'heer'
  const c = String(uniteCode).toLowerCase()
  if (c === '009') return 'luftwaffe' // Fallschirmjaeger
  if (c === '254') return 'feld'
  if (c === '130') return 'panzer'
  if (c === '916s') return 'sanit'
  if (c === '001') return 'marine' // Marine Pionier
  return 'heer' // 916, 919, 084, 716, etc.
}

function getRegimentLabel(uniteCode, uniteNom) {
  const c = String(uniteCode || '')
  if (c === '009') return 'Fallschirmjaeger Regiment'
  if (c === '254') return 'Feldgendarmerie'
  if (c === '130') return 'Panzer Lehr Division'
  if (c === '916S' || c === '916s') return 'Sanitaets-Abteilung'
  if (c === '919') return 'Logistik-Abteilung'
  if (c === '084') return 'Armeekorps'
  if (c === '716') return 'Reserve'
  if (c === '001') return 'Marine Pionier Bataillon'
  return uniteNom || 'Grenadier Regiment'
}

function getCoverSubtitle(theme) {
  if (theme === 'luftwaffe') return 'Luftwaffe'
  if (theme === 'marine') return 'Kriegsmarine'
  return null // Heer doesn't have branch subtitle on cover
}

// 10 Commandements — French version
const ZEHN_GEBOTE_FR = [
  "Le soldat allemand combat avec chevalerie. Il lutte pour la victoire de son peuple. Les actes de cruaute et la destruction inutile sont indignes de lui.",
  "Le combattant doit etre en uniforme ou porter un insigne distinctif, specialement retroussit et bien visible. Se battre en civil sans un tel insigne est interdit.",
  "Aucun ennemi ne doit etre tue s'il se rend, pas meme les franc-tireurs et les espions. Les voleurs recoivent leur juste chatiment devant les tribunaux.",
  "Les prisonniers de guerre ne doivent ni etre maltraites ni insultes. Toutes armes, plans et documents doivent etre confisques. Aucun autre bien personnel ne doit leur etre retire.",
  "Les balles Dum-Dum sont interdites. Il est egalement interdit de modifier des projectiles pour les transformer en balles Dum-Dum.",
  "La Croix-Rouge est inviolable. Les ennemis blesses doivent etre traites humainement. Le personnel medical et les aumoniers ne doivent pas etre empeches de remplir leur mission.",
  "La population civile est inviolable. Le soldat ne doit ni piller ni detruire gratuitement. Les monuments historiques et les batiments religieux, culturels, scientifiques ou charitables doivent etre respectes. Les requisitions en nature ou en service ne peuvent etre ordonnees que par un superieur et doivent etre compensees.",
  "Les territoires neutres ne doivent en aucun cas etre impliques dans les operations militaires, que ce soit par intrusion.",
  "Si un soldat allemand est fait prisonnier, il doit, en cas d'interrogatoire, declarer son nom et son grade. En aucun cas il ne doit reveler son unite d'appartenance ni donner d'informations militaires, politiques ou economiques sur l'Allemagne. Il ne doit se laisser influencer ni par des promesses ni par des menaces.",
  "Les infractions aux ordres ci-dessus en matiere de service sont punissables. Les violations des principes 1 a 8 par l'ennemi doivent etre signalees. Toute mesure de represailles ne peut etre prise que sur ordre du commandement superieur."
]

export default function SoldbuchBook({ effectif, decorations = [] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentSpread, setCurrentSpread] = useState(0) // 0 = pages 1-2, 1 = pages 3-4, etc.

  const e = effectif
  const theme = getTheme(e.unite_code)
  const regimentLabel = getRegimentLabel(e.unite_code, e.unite_nom)
  const coverSubtitle = getCoverSubtitle(theme)
  const isLuftwaffe = theme === 'luftwaffe'

  // Total spreads
  const totalSpreads = 3 // spread 0: gebote+page1, spread 1: page2+page3, spread 2: page4+page5

  if (!isOpen) {
    return (
      <div className={`soldbuch-book-wrapper soldbuch-theme-${theme}`}>
        <div className="soldbuch-cover" onClick={() => setIsOpen(true)}>
          <span className="cover-name">{e.nom}</span>
          <div className="cover-border">
            <div className="cover-eagle">
              {isLuftwaffe
                ? <LuftwaffeEagleSVG color="currentColor" size={90} />
                : <EagleSVG color="currentColor" size={90} />
              }
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

  return (
    <div className={`soldbuch-book-wrapper soldbuch-theme-${theme}`}>
      <div className="soldbuch-book">
        <div className="soldbuch-spread">
          {currentSpread === 0 && (
            <>
              {/* Left: 10 Commandements */}
              <div className="soldbuch-page soldbuch-page-left soldbuch-page-gebote">
                <div className="sb-gebote">
                  <h3>10 Commandements</h3>
                  <h4>pour la conduite du soldat allemand en temps de guerre</h4>
                  <ol>
                    {ZEHN_GEBOTE_FR.map((g, i) => <li key={i}>{g}</li>)}
                  </ol>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.5rem', opacity: 0.5 }}>
                    W.N.3. 11/III. 4. 1000. 4/1901.
                  </div>
                </div>
                <div className="page-number"></div>
              </div>

              {/* Right: Page 1 — Identity */}
              <div className="soldbuch-page soldbuch-page-right">
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '4px' }}>Soldbuch</div>
                  <div style={{ fontSize: '0.7rem', letterSpacing: '2px' }}>et carte d'identite</div>
                </div>

                {/* Nr. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                  <span style={{ fontWeight: 700 }}>Nr.</span>
                  <span style={{
                    background: 'rgba(0,0,0,0.08)', padding: '2px 16px',
                    borderBottom: '1px solid rgba(0,0,0,0.3)', flex: 1, textAlign: 'center',
                    fontWeight: 600
                  }}>
                    {e.id || '—'}
                  </span>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontWeight: 600 }}>pour</div>

                {/* Rang */}
                <div className="sb-field">
                  <span className="sb-field-label">le</span>
                  <span className="sb-field-value">{e.grade_nom || '—'}</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.65rem', opacity: 0.5, marginBottom: '0.5rem' }}>
                  (rang)
                </div>

                {/* Promotion box */}
                <div className="sb-box">
                  <div className="sb-promo-row">
                    <span className="sb-promo-label" style={{ minWidth: 'auto' }}></span>
                    <span className="sb-promo-date" style={{ textAlign: 'center', fontSize: '0.65rem', opacity: 0.5, borderBottom: 'none' }}>
                      (Date)
                    </span>
                    <span className="sb-promo-grade" style={{ textAlign: 'center', fontSize: '0.65rem', opacity: 0.5, borderBottom: 'none' }}>
                      (nouveau grade)
                    </span>
                  </div>
                  <div className="sb-promo-row">
                    <span className="sb-promo-label">le</span>
                    <span className="sb-promo-date">{e.date_entree_ig || ''}</span>
                    <span className="sb-promo-grade">{e.grade_nom || ''}</span>
                  </div>
                  <div className="sb-promo-row">
                    <span className="sb-promo-label">le</span>
                    <span className="sb-promo-date"></span>
                    <span className="sb-promo-grade"></span>
                  </div>
                  <div className="sb-promo-row">
                    <span className="sb-promo-label">le</span>
                    <span className="sb-promo-date"></span>
                    <span className="sb-promo-grade"></span>
                  </div>
                </div>

                {/* Prenom et nom */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div className="sb-field">
                    <span className="sb-field-value" style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.95rem' }}>
                      {e.prenom} {e.nom}
                    </span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.65rem', opacity: 0.5 }}>
                    (Prenom et nom)
                  </div>
                </div>

                {/* Bottom fields */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div className="sb-field">
                    <span className="sb-field-label">Plaque d'identite</span>
                    <span className="sb-field-value">{e.numero_service || ''}</span>
                  </div>
                  <div className="sb-field">
                    <span className="sb-field-label">Groupe sanguin</span>
                    <span className="sb-field-value">{e.blutgruppe || ''}</span>
                  </div>
                  <div className="sb-field">
                    <span className="sb-field-label">Taille du masque a gaz</span>
                    <span className="sb-field-value">{e.gasmaskengroesse || ''}</span>
                  </div>
                  <div className="sb-field">
                    <span className="sb-field-label">Numero de service</span>
                    <span className="sb-field-value">{e.wehrnummer || ''}</span>
                  </div>
                </div>

                <div className="page-number">1</div>
              </div>
            </>
          )}

          {currentSpread === 1 && (
            <>
              {/* Left: Page 2 — Description personnelle */}
              <div className="soldbuch-page soldbuch-page-left">
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Ne le</span>
                    <span className="sb-field-value">{e.date_naissance || ''}</span>
                  </div>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">a</span>
                    <span className="sb-field-value">{e.lieu_naissance || ''}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.6rem', opacity: 0.5, marginBottom: '0.5rem' }}>
                  (Lieu, district)
                </div>

                <hr className="sb-divider" />

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Religion</span>
                    <span className="sb-field-value">{e.religion || ''}</span>
                  </div>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Profession</span>
                    <span className="sb-field-value">{e.beruf || ''}</span>
                  </div>
                </div>

                <div className="sb-section-title">Description personnelle :</div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.3rem' }}>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Taille</span>
                    <span className="sb-field-value">{e.taille_cm ? `${e.taille_cm}` : ''}</span>
                  </div>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Corpulence</span>
                    <span className="sb-field-value">{e.gestalt || ''}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.3rem' }}>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Visage</span>
                    <span className="sb-field-value">{e.gesicht || ''}</span>
                  </div>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Cheveux</span>
                    <span className="sb-field-value">{e.haar || ''}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.3rem' }}>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Barbe</span>
                    <span className="sb-field-value">{e.bart || ''}</span>
                  </div>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Yeux</span>
                    <span className="sb-field-value">{e.augen || ''}</span>
                  </div>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontWeight: 700 }}>Signes</div>
                  <div style={{ fontWeight: 700 }}>particuliers (ex.</div>
                  <div style={{ fontWeight: 700 }}>porteur de lunettes) :</div>
                  <div className="sb-field-value" style={{ minHeight: '1.2em', borderBottom: '1px dotted rgba(0,0,0,0.3)' }}>
                    {e.besondere_kennzeichen || ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.8rem' }}>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Pointure</span>
                    <span className="sb-field-value">{e.schuhzeuglaenge || ''}</span>
                  </div>
                </div>

                {/* Signature */}
                <div className="sb-signature-area" style={{ marginTop: '1rem' }}>
                  <div className="sb-signature-line">
                    {e.signature_soldat && <img src={e.signature_soldat} alt="Signature" />}
                  </div>
                  <div className="sb-signature-caption">
                    (Prenom et nom, signature manuscrite du titulaire)
                  </div>
                </div>

                <hr className="sb-divider" />

                <div style={{ fontSize: '0.65rem', lineHeight: 1.4 }}>
                  <strong>L'exactitude des informations non modifiees des pages 1 et 2 ainsi que
                  la signature manuscrite du titulaire sont certifiees</strong>
                </div>

                <div className="sb-field" style={{ marginTop: '0.5rem' }}>
                  <span className="sb-field-label" style={{ minWidth: 30 }}>le</span>
                  <span className="sb-field-value">{e.date_entree_ig || ''}</span>
                </div>

                <div className="sb-field" style={{ marginTop: '0.3rem' }}>
                  <span className="sb-field-value" style={{ textAlign: 'center', fontSize: '0.65rem' }}>
                    (Unite emettrice, poste de service)
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.3rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>Tampon</div>
                  <div>
                    {e.stamp_path && <img src={e.stamp_path} alt="Tampon" style={{ maxHeight: 50, opacity: 0.6 }} />}
                  </div>
                  <div className="sb-signature-area" style={{ marginTop: 0 }}>
                    <div className="sb-signature-line" style={{ width: 120 }}>
                      {e.signature_referent && <img src={e.signature_referent} alt="Referent" />}
                    </div>
                  </div>
                </div>

                <div className="page-number">2</div>
              </div>

              {/* Right: Page 3 — Photo + Affectation */}
              <div className="soldbuch-page soldbuch-page-right">
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <div className="sb-photo-area">
                    {e.photo
                      ? <img src={e.photo} alt="Photo" />
                      : <span style={{ fontSize: '0.65rem', opacity: 0.4 }}>Photo</span>
                    }
                  </div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: 4 }}>(Photo du titulaire)</div>
                </div>

                <div className="sb-section-title">Affectation</div>

                <div className="sb-field">
                  <span className="sb-field-label">Unite</span>
                  <span className="sb-field-value">{`${e.unite_code || ''} ${e.unite_nom || ''}`.trim()}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Grade</span>
                  <span className="sb-field-value">{e.grade_nom || '—'}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Fonction</span>
                  <span className="sb-field-value">{e.fonction || ''}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Specialite</span>
                  <span className="sb-field-value">{e.specialite || ''}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Entree (RP)</span>
                  <span className="sb-field-value">{e.date_entree_ig || ''}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Entree (IRL)</span>
                  <span className="sb-field-value">{e.date_entree_irl || ''}</span>
                </div>

                <div className="sb-section-title" style={{ marginTop: '1.5rem' }}>Equipement</div>
                <div className="sb-field">
                  <span className="sb-field-label">Arme principale</span>
                  <span className="sb-field-value">{e.arme_principale || ''}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Arme secondaire</span>
                  <span className="sb-field-value">{e.arme_secondaire || ''}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Equipement special</span>
                  <span className="sb-field-value">{e.equipement_special || ''}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Tenue</span>
                  <span className="sb-field-value">{e.tenue || ''}</span>
                </div>

                <div className="page-number">3</div>
              </div>
            </>
          )}

          {currentSpread === 2 && (
            <>
              {/* Left: Page 4 — Historique */}
              <div className="soldbuch-page soldbuch-page-left">
                <div className="sb-section-title">Parcours de service</div>
                <div style={{ whiteSpace: 'pre-line', fontSize: '0.8rem', lineHeight: 1.6 }}>
                  {e.historique || '—'}
                </div>

                <div className="page-number">4</div>
              </div>

              {/* Right: Page 5 — Decorations */}
              <div className="soldbuch-page soldbuch-page-right">
                <div className="sb-section-title">Decorations</div>

                {decorations.length > 0 ? (
                  <div>
                    {decorations.map((d, i) => (
                      <div key={d.id || i} style={{ marginBottom: '0.5rem', paddingBottom: '0.3rem', borderBottom: '1px dotted rgba(0,0,0,0.15)' }}>
                        <div style={{ fontWeight: 600 }}>
                          {d.decoration_nom || d.nom_custom}
                          {d.nom_allemand && <span style={{ opacity: 0.6, fontWeight: 400, fontStyle: 'italic', marginLeft: 6 }}>({d.nom_allemand})</span>}
                        </div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                          {d.date_attribution && <span>{d.date_attribution}</span>}
                          {d.attribue_par && <span> — decerne par {d.attribue_par}</span>}
                        </div>
                        {d.motif && <div style={{ fontSize: '0.7rem', fontStyle: 'italic', opacity: 0.6 }}>"{d.motif}"</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', opacity: 0.4, marginTop: '2rem' }}>
                    Aucune decoration enregistree
                  </div>
                )}

                <div className="page-number">5</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="soldbuch-nav">
        <button onClick={() => setIsOpen(false)}>📕 Couverture</button>
        <button onClick={() => setCurrentSpread(s => s - 1)} disabled={currentSpread === 0}>
          ◀ Page precedente
        </button>
        <span style={{ fontFamily: 'Courier New', fontSize: '0.8rem', opacity: 0.5, padding: '0.4rem' }}>
          {currentSpread * 2 + 1}–{currentSpread * 2 + 2} / {totalSpreads * 2}
        </span>
        <button onClick={() => setCurrentSpread(s => s + 1)} disabled={currentSpread >= totalSpreads - 1}>
          Page suivante ▶
        </button>
      </div>
    </div>
  )
}
