import React, { useState } from 'react'
import './soldbuch-book.css'

/* =============================================
   SoldbuchBook — Authentic WW2 Soldbuch Viewer
   Per-regiment templates, page-flip, denazified
   ============================================= */

// Regiment theme mapping
function getTheme(uniteCode) {
  if (!uniteCode) return 'heer'
  const c = String(uniteCode).toLowerCase()
  if (c === '009' || c === '007') return 'luftwaffe' // Fallschirmjaeger / FSM
  if (c === '254') return 'feld'
  if (c === '130') return 'panzer'
  if (c === '916s') return 'sanit'
  return 'heer' // 916, 919, 084, 716, etc.
}

function getRegimentLabel(uniteCode, uniteNom) {
  const c = String(uniteCode || '')
  if (c === '009') return 'Fallschirmjaeger Regiment'
  if (c === '254') return 'Feldgendarmerie'
  if (c === '130') return 'Panzer Lehr'
  if (c === '916S' || c === '916s') return 'Sanitaets-Abteilung'
  if (c === '919') return 'Logistik-Abteilung'
  if (c === '084') return 'Armeekorps'
  if (c === '716') return 'Reserve'
  return uniteNom || 'Grenadier Regiment'
}

function getFlag(theme) {
  if (theme === 'luftwaffe') return '🇫🇷'
  return '🇩🇪'
}

// 10 Gebote — German version (Heer default)
const ZEHN_GEBOTE_DE = [
  'Der deutsche Soldat kaempft ritterlich fuer den Sieg seines Volkes. Grausamkeiten und nutzlose Zerstoerung sind seiner unwuerdig.',
  'Der Kaempfer muss uniformiert sein oder mit einem besonderen, weithin sichtbaren Abzeichen versehen sein. Kaempfen in Zivilkleidung ohne ein solches Abzeichen ist verboten.',
  'Es darf kein Gegner getoetet werden, der sich ergibt, auch nicht der Freischaerler und der Spion. Diese erhalten ihre gerechte Strafe durch die Gerichte.',
  'Kriegsgefangene duerfen nicht misshandelt oder beleidigt werden. Waffen, Plaene und Aufzeichnungen sind abzunehmen. Von ihrer Habe darf sonst nichts abgenommen werden.',
  'Dum-Dum-Geschosse sind verboten. Geschosse duerfen auch nicht in solche umgeaendert werden.',
  'Das rote Kreuz ist unverletzlich. Verwundete Gegner sind menschlich zu behandeln. Sanitaetspersonal und Feldgeistliche duerfen in ihrer aerztlichen bzw. seelsorgerischen Taetigkeit nicht gehindert werden.',
  'Die Zivilbevoelkerung ist unverletzlich. Der Soldat darf nicht pluendern oder mutwillig zerstoeren. Geschichtliche Denkmaeler und Gebaeude, die dem Gottesdienst, der Kunst, Wissenschaft oder der Wohltaetigkeit dienen, sind besonders zu achten. Natural- und Dienstleistungen von der Bevoelkerung duerfen nur auf Befehl von Vorgesetzten gegen Entschaedigung beansprucht werden.',
  'Neutrales Gebiet darf weder durch Betreten oder Ueberfliegen noch durch Beschiessen in die Kriegshandlungen einbezogen werden.',
  'Geraet ein deutscher Soldat in Gefangenschaft, so muss er auf Befragen seinen Namen und Dienstgrad angeben. Unter keinen Umstaenden darf er ueber seine Zugehoerigkeit zu seinem Truppenteil und ueber militaerische, politische und wirtschaftliche Verhaeltnisse auf der deutschen Seite aussagen. Weder durch Versprechungen noch durch Drohungen darf er sich dazu verleiten lassen.',
  'Zuwiderhandlungen gegen die vorstehenden Befehle in Dienstvorschriften sind strafbar. Verstoesse des Feindes gegen die unter 1 bis 8 aufgefuehrten Grundsaetze sind zu melden. Vergeltungsmassregeln sind nur auf Befehl der hoeheren Truppenfuehrung zulaessig.'
]

// 10 Commandements — French version (FSM)
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
  const flag = getFlag(theme)
  const isFrench = theme === 'luftwaffe'
  const gebote = isFrench ? ZEHN_GEBOTE_FR : ZEHN_GEBOTE_DE
  const geboteTitle = isFrench
    ? '10 Commandements'
    : '10 Gebote'
  const geboteSubtitle = isFrench
    ? 'pour la conduite du soldat allemand en temps de guerre'
    : 'fuer die Kriegsfuehrung des deutschen Soldaten'

  // Total spreads
  const totalSpreads = 3 // spread 0: gebote+page1, spread 1: page2+page3, spread 2: page4+page5

  if (!isOpen) {
    return (
      <div className={`soldbuch-book-wrapper soldbuch-theme-${theme}`}>
        <div className="soldbuch-cover" onClick={() => setIsOpen(true)}>
          <span className="cover-name">{e.nom}</span>
          <div className="cover-border">
            <div className="cover-eagle">🦅</div>
            <div className="cover-title">Soldbuch</div>
            <div className="cover-subtitle">zugleich Personalausweis</div>
            <div className="cover-regiment">{regimentLabel}</div>
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
              {/* Left: 10 Gebote */}
              <div className="soldbuch-page soldbuch-page-left soldbuch-page-gebote">
                <div className="sb-gebote">
                  <h3>{geboteTitle}</h3>
                  <h4>{geboteSubtitle}</h4>
                  <ol>
                    {gebote.map((g, i) => <li key={i}>{g}</li>)}
                  </ol>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.5rem', opacity: 0.5 }}>
                    W.N.3. 11/III. 4. 1000. 4/1901.
                  </div>
                </div>
                <div className="page-number"></div>
              </div>

              {/* Right: Page 1 — Identity */}
              <div className="soldbuch-page soldbuch-page-right">
                <span className="sb-flag">{flag}</span>

                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '4px' }}>Soldbuch</div>
                  <div style={{ fontSize: '0.7rem', letterSpacing: '2px' }}>zugleich Personalausweis</div>
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

                <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontWeight: 600 }}>
                  {isFrench ? 'pour' : 'fuer'}
                </div>

                {/* Dienstgrad */}
                <div className="sb-field">
                  <span className="sb-field-label">{isFrench ? 'le' : 'den'}</span>
                  <span className="sb-field-value">{e.grade_nom || '—'}</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.65rem', opacity: 0.5, marginBottom: '0.5rem' }}>
                  ({isFrench ? 'rang' : 'Dienstgrad'})
                </div>

                {/* Promotion box */}
                <div className="sb-box">
                  <div className="sb-promo-row">
                    <span className="sb-promo-label" style={{ minWidth: 'auto' }}></span>
                    <span className="sb-promo-date" style={{ textAlign: 'center', fontSize: '0.65rem', opacity: 0.5, borderBottom: 'none' }}>
                      ({isFrench ? 'Date' : 'Datum'})
                    </span>
                    <span className="sb-promo-grade" style={{ textAlign: 'center', fontSize: '0.65rem', opacity: 0.5, borderBottom: 'none' }}>
                      ({isFrench ? 'nouveau grade' : 'neuer Dienstgrad'})
                    </span>
                  </div>
                  <div className="sb-promo-row">
                    <span className="sb-promo-label">{isFrench ? 'le' : 'ab'}</span>
                    <span className="sb-promo-date">{e.date_entree_ig || ''}</span>
                    <span className="sb-promo-grade">{e.grade_nom || ''}</span>
                  </div>
                  <div className="sb-promo-row">
                    <span className="sb-promo-label">{isFrench ? 'le' : 'ab'}</span>
                    <span className="sb-promo-date"></span>
                    <span className="sb-promo-grade"></span>
                  </div>
                  <div className="sb-promo-row">
                    <span className="sb-promo-label">{isFrench ? 'le' : 'ab'}</span>
                    <span className="sb-promo-date"></span>
                    <span className="sb-promo-grade"></span>
                  </div>
                </div>

                {/* Vor- und Zuname */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div className="sb-field">
                    <span className="sb-field-value" style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.95rem' }}>
                      {e.prenom} {e.nom}
                    </span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.65rem', opacity: 0.5 }}>
                    ({isFrench ? 'Prenom et nom' : 'Vor- und Zuname'})
                  </div>
                </div>

                {/* Bottom fields */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div className="sb-field">
                    <span className="sb-field-label">{isFrench ? 'Plaque d\'identite' : 'Erkennungsmarke'}</span>
                    <span className="sb-field-value">{e.numero_service || ''}</span>
                  </div>
                  <div className="sb-field">
                    <span className="sb-field-label">{isFrench ? 'Groupe sanguin' : 'Blutgruppe'}</span>
                    <span className="sb-field-value">{e.blutgruppe || ''}</span>
                  </div>
                  <div className="sb-field">
                    <span className="sb-field-label">{isFrench ? 'Taille du masque a gaz' : 'Gasmaskengroesse'}</span>
                    <span className="sb-field-value">{e.gasmaskengroesse || ''}</span>
                  </div>
                  <div className="sb-field">
                    <span className="sb-field-label">{isFrench ? 'Numero de service' : 'Wehrnummer'}</span>
                    <span className="sb-field-value">{e.wehrnummer || ''}</span>
                  </div>
                </div>

                <div className="page-number">1</div>
              </div>
            </>
          )}

          {currentSpread === 1 && (
            <>
              {/* Left: Page 2 — Personalbeschreibung */}
              <div className="soldbuch-page soldbuch-page-left">
                {/* Birth info */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">geb. am</span>
                    <span className="sb-field-value">{e.date_naissance || ''}</span>
                  </div>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">in</span>
                    <span className="sb-field-value">{e.lieu_naissance || ''}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.6rem', opacity: 0.5, marginBottom: '0.5rem' }}>
                  (Ort, Kreis, Verw.-Bezirk)
                </div>

                <hr className="sb-divider" />

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Religion</span>
                    <span className="sb-field-value">{e.religion || ''}</span>
                  </div>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Stand, Beruf</span>
                    <span className="sb-field-value">{e.beruf || ''}</span>
                  </div>
                </div>

                {/* Personalbeschreibung */}
                <div className="sb-section-title">Personalbeschreibung :</div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.3rem' }}>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Groesse</span>
                    <span className="sb-field-value">{e.taille_cm ? `${e.taille_cm}` : ''}</span>
                  </div>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Gestalt</span>
                    <span className="sb-field-value">{e.gestalt || ''}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.3rem' }}>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Gesicht</span>
                    <span className="sb-field-value">{e.gesicht || ''}</span>
                  </div>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Haar</span>
                    <span className="sb-field-value">{e.haar || ''}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.3rem' }}>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Bart</span>
                    <span className="sb-field-value">{e.bart || ''}</span>
                  </div>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Augen</span>
                    <span className="sb-field-value">{e.augen || ''}</span>
                  </div>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontWeight: 700 }}>Besondere</div>
                  <div style={{ fontWeight: 700 }}>Kennzeichen (z.</div>
                  <div style={{ fontWeight: 700 }}>B. Brillentraeger):</div>
                  <div className="sb-field-value" style={{ minHeight: '1.2em', borderBottom: '1px dotted rgba(0,0,0,0.3)' }}>
                    {e.besondere_kennzeichen || ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.8rem' }}>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Schuhzeuglaenge</span>
                    <span className="sb-field-value">{e.schuhzeuglaenge || ''}</span>
                  </div>
                  <div className="sb-field" style={{ flex: 1 }}>
                    <span className="sb-field-label">Schuhzeugweite</span>
                    <span className="sb-field-value">{e.schuhzeugweite || ''}</span>
                  </div>
                </div>

                {/* Signature */}
                <div className="sb-signature-area" style={{ marginTop: '1rem' }}>
                  <div className="sb-signature-line">
                    {e.signature_soldat && <img src={e.signature_soldat} alt="Signature" />}
                  </div>
                  <div className="sb-signature-caption">
                    (Vor- und Zuname, eigenhaendige Unterschrift des Inhabers)
                  </div>
                </div>

                <hr className="sb-divider" />

                <div style={{ fontSize: '0.65rem', lineHeight: 1.4 }}>
                  <strong>Die Richtigkeit der nicht umgeaenderten Angaben auf Seiten 1 und 2 und
                  der eigenhaendigen Unterschrift des Inhabers bescheinigt</strong>
                </div>

                <div className="sb-field" style={{ marginTop: '0.5rem' }}>
                  <span className="sb-field-label" style={{ minWidth: 30 }}>den</span>
                  <span className="sb-field-value">{e.date_entree_ig || ''}</span>
                </div>

                <div className="sb-field" style={{ marginTop: '0.3rem' }}>
                  <span className="sb-field-value" style={{ textAlign: 'center', fontSize: '0.65rem' }}>
                    (Ausfertigender Truppenteil, Dienststelle)
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.3rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>Dienststempel</div>
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
                {/* Photo */}
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <div className="sb-photo-area">
                    {e.photo
                      ? <img src={e.photo} alt="Photo" />
                      : <span style={{ fontSize: '0.65rem', opacity: 0.4 }}>Lichtbild</span>
                    }
                  </div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: 4 }}>(Lichtbild des Inhabers)</div>
                </div>

                <div className="sb-section-title">Truppenzugehoerigkeit</div>

                <div className="sb-field">
                  <span className="sb-field-label">Einheit</span>
                  <span className="sb-field-value">{`${e.unite_code || ''} ${e.unite_nom || ''}`.trim()}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Dienstgrad</span>
                  <span className="sb-field-value">{e.grade_nom || '—'}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Funktion</span>
                  <span className="sb-field-value">{e.fonction || ''}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Spezialitaet</span>
                  <span className="sb-field-value">{e.specialite || ''}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Eintritt (RP)</span>
                  <span className="sb-field-value">{e.date_entree_ig || ''}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Eintritt (IRL)</span>
                  <span className="sb-field-value">{e.date_entree_irl || ''}</span>
                </div>

                <div className="sb-section-title" style={{ marginTop: '1.5rem' }}>Ausruestung</div>
                <div className="sb-field">
                  <span className="sb-field-label">Hauptwaffe</span>
                  <span className="sb-field-value">{e.arme_principale || ''}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Nebenwaffe</span>
                  <span className="sb-field-value">{e.arme_secondaire || ''}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Sonderausruestung</span>
                  <span className="sb-field-value">{e.equipement_special || ''}</span>
                </div>
                <div className="sb-field">
                  <span className="sb-field-label">Uniform</span>
                  <span className="sb-field-value">{e.tenue || ''}</span>
                </div>

                <div className="page-number">3</div>
              </div>
            </>
          )}

          {currentSpread === 2 && (
            <>
              {/* Left: Page 4 — Historique / Dienstlaufbahn */}
              <div className="soldbuch-page soldbuch-page-left">
                <div className="sb-section-title">Dienstlaufbahn</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.5, textAlign: 'center', marginBottom: '0.5rem' }}>
                  (Historique de service)
                </div>
                <div style={{ whiteSpace: 'pre-line', fontSize: '0.8rem', lineHeight: 1.6 }}>
                  {e.historique || '—'}
                </div>

                <div className="page-number">4</div>
              </div>

              {/* Right: Page 5 — Decorations */}
              <div className="soldbuch-page soldbuch-page-right">
                <div className="sb-section-title">Auszeichnungen</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.5, textAlign: 'center', marginBottom: '0.5rem' }}>
                  (Decorations)
                </div>

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
                          {d.attribue_par && <span> — verliehen von {d.attribue_par}</span>}
                        </div>
                        {d.motif && <div style={{ fontSize: '0.7rem', fontStyle: 'italic', opacity: 0.6 }}>"{d.motif}"</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', opacity: 0.4, marginTop: '2rem' }}>
                    Keine Auszeichnungen eingetragen
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
