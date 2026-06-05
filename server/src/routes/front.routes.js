const router = require('express').Router()
const { query, queryOne, pool } = require('../config/db')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/auth')
const fs = require('fs')
const path = require('path')

// Load combat rules for AI context
let combatRulesContext = ''
try {
  combatRulesContext = fs.readFileSync(path.join(__dirname, '..', '..', 'combat-rules-context.md'), 'utf-8')
} catch (err) {
  console.warn('[Groq] combat-rules-context.md not found, AI analysis will work without rules context')
}

// GET /api/front/cartes — All maps with stats + VPs
router.get('/cartes', optionalAuth, async (req, res) => {
  try {
    const cartes = await query('SELECT * FROM situation_front_cartes ORDER BY ordre')
    for (const c of cartes) {
      c.vps = await query('SELECT * FROM situation_front_vp WHERE carte_id = ? ORDER BY numero', [c.id])
      // Last VP events for current VP display
      c.lastEvents = await query(`
        SELECT e.*, v.numero as vp_numero FROM situation_front_events e 
        LEFT JOIN situation_front_vp v ON v.id = e.vp_id
        WHERE e.carte_id = ? AND e.type_event IN ('prise','perte','debut','fin')
        ORDER BY e.date_irl ASC
      `, [c.id])
      c.stats = await queryOne(`
        SELECT 
          SUM(CASE WHEN type_event='attaque' AND camp_vainqueur='allemand' THEN 1 ELSE 0 END) as att_all,
          SUM(CASE WHEN type_event='attaque' AND camp_vainqueur='us' THEN 1 ELSE 0 END) as att_us,
          SUM(CASE WHEN type_event='defense' AND camp_vainqueur='allemand' THEN 1 ELSE 0 END) as def_all,
          SUM(CASE WHEN type_event='defense' AND camp_vainqueur='us' THEN 1 ELSE 0 END) as def_us,
          SUM(CASE WHEN type_event='prise' THEN 1 ELSE 0 END) as prises,
          SUM(CASE WHEN type_event='perte' THEN 1 ELSE 0 END) as pertes
        FROM situation_front_events WHERE carte_id = ?
      `, [c.id])
    }
    res.json({ success: true, data: cartes })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// GET /api/front/cartes/:id/events — History for a map
router.get('/cartes/:id/events', optionalAuth, async (req, res) => {
  try {
    const events = await query(`
      SELECT e.*, v.nom as vp_nom, v.numero as vp_numero,
        CONCAT(ef.prenom,' ',ef.nom) as rapporte_par_nom 
      FROM situation_front_events e 
      LEFT JOIN situation_front_vp v ON v.id = e.vp_id
      LEFT JOIN effectifs ef ON ef.id = e.rapporte_par
      WHERE e.carte_id = ? ORDER BY e.date_irl DESC, e.heure DESC, e.id DESC
    `, [req.params.id])
    res.json({ success: true, data: events })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// POST /api/front/cartes/:id/events — Add event
router.post('/cartes/:id/events', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isSousOfficier && !req.user.isEtatMajor && !req.user.isRecenseur)
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    const { type_event, resultat, camp_vainqueur, vp_id, heure, note, date_irl: customDate, date_rp } = req.body
    if (!type_event) return res.status(400).json({ success: false, message: 'Type requis' })
    // Administratifs can set a custom date_irl for retroactive entries
    const dateIrl = (req.user.isRecenseur || req.user.isAdmin) && customDate ? customDate : new Date()
    const [result] = await pool.execute(
      'INSERT INTO situation_front_events (carte_id, type_event, resultat, camp_vainqueur, vp_id, heure, note, rapporte_par, date_irl, date_rp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.params.id, type_event, resultat || 'vp', camp_vainqueur || '', vp_id || null, heure || null, note || null, req.user.effectif_id || null, dateIrl, date_rp || null]
    )
    // Log retroactive edits by administratifs
    if (req.user.isRecenseur && !req.user.isAdmin) {
      const { logActivity } = require('../utils/logger')
      logActivity(req, 'admin_retro_front', 'front_event', result.insertId, `Evenement front ajoute sur carte #${req.params.id}: ${type_event}`)
    }
    res.json({ success: true, data: { id: result.insertId } })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// DELETE /api/front/events/:id
router.delete('/events/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && !req.user.isOfficier && !req.user.isEtatMajor && !req.user.isRecenseur)
      return res.status(403).json({ success: false, message: 'Non autorisé' })
    await pool.execute('DELETE FROM situation_front_events WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// GET /api/front/rapport — Weekly/daily front report
router.get('/rapport', optionalAuth, async (req, res) => {
  try {
    const { periode, date_debut } = req.query
    let where = ''
    const params = []
    const refDate = date_debut || new Date().toISOString().slice(0, 10)
    if (periode === 'jour') {
      where = 'AND DATE(e.date_irl) = ?'
      params.push(refDate)
    } else if (periode === 'semaine') {
      // RP week: Friday 20h → Friday 20h
      // Find the Friday before or on refDate
      const ref = new Date(refDate + 'T12:00:00')
      const day = ref.getDay() // 0=Sun 5=Fri
      const diff = day >= 5 ? day - 5 : day + 2
      const fri = new Date(ref); fri.setDate(ref.getDate() - diff)
      const friEnd = new Date(fri); friEnd.setDate(fri.getDate() + 7)
      where = 'AND DATE(e.date_irl) >= ? AND DATE(e.date_irl) < ?'
      params.push(fri.toISOString().slice(0, 10), friEnd.toISOString().slice(0, 10))
    }

    const cartes = await query('SELECT * FROM situation_front_cartes ORDER BY ordre')
    const rapport = []
    for (const c of cartes) {
      const events = await query(`
        SELECT e.*, v.nom as vp_nom, v.numero as vp_numero
        FROM situation_front_events e 
        LEFT JOIN situation_front_vp v ON v.id = e.vp_id
        WHERE e.carte_id = ? ${where}
        ORDER BY e.date_irl DESC, e.heure DESC, e.id DESC
      `, [c.id, ...params])

      const att_all = events.filter(e => e.type_event === 'attaque' && e.camp_vainqueur === 'allemand').length
      const att_us = events.filter(e => e.type_event === 'attaque' && e.camp_vainqueur === 'us').length
      const def_all = events.filter(e => e.type_event === 'defense' && e.camp_vainqueur === 'allemand').length
      const def_us = events.filter(e => e.type_event === 'defense' && e.camp_vainqueur === 'us').length
      const stats = {
        att_all, att_us, def_all, def_us,
        nb_attaques: att_all + att_us,
        nb_defenses: def_all + def_us,
        prises: events.filter(e => e.type_event === 'prise').length,
        pertes: events.filter(e => e.type_event === 'perte').length
      }
      rapport.push({ carte: c, events, stats })
    }
    res.json({ success: true, data: rapport })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// GET /api/front/cartes/:id/stats — Detailed stats for dashboard
router.get('/cartes/:id/stats', optionalAuth, async (req, res) => {
  try {
    const carteId = req.params.id
    // All events for this carte
    const events = await query(`
      SELECT e.*, v.nom as vp_nom, v.numero as vp_numero
      FROM situation_front_events e
      LEFT JOIN situation_front_vp v ON v.id = e.vp_id
      WHERE e.carte_id = ?
      ORDER BY e.date_irl ASC, e.heure ASC, e.id ASC
    `, [carteId])

    const vps = await query('SELECT * FROM situation_front_vp WHERE carte_id = ? ORDER BY numero', [carteId])

    // Batailles breakdown
    const batailles = events.filter(e => e.type_event === 'attaque' || e.type_event === 'defense')
    const att_all = batailles.filter(e => e.type_event === 'attaque' && e.camp_vainqueur === 'allemand').length
    const att_us = batailles.filter(e => e.type_event === 'attaque' && e.camp_vainqueur === 'us').length
    const def_all = batailles.filter(e => e.type_event === 'defense' && e.camp_vainqueur === 'allemand').length
    const def_us = batailles.filter(e => e.type_event === 'defense' && e.camp_vainqueur === 'us').length

    // VP movements per VP
    const vpStats = {}
    for (const vp of vps) {
      const vpEvts = events.filter(e => (e.vp_id === vp.id || e.vp_numero === vp.numero) && (e.type_event === 'prise' || e.type_event === 'perte'))
      const prises = vpEvts.filter(e => e.type_event === 'prise')
      const pertes = vpEvts.filter(e => e.type_event === 'perte')
      
      // Average hold time: time between prise and next perte (in hours)
      let totalHoldMs = 0, holdCount = 0
      for (let i = 0; i < vpEvts.length; i++) {
        if (vpEvts[i].type_event === 'prise') {
          const nextPerte = vpEvts.slice(i + 1).find(e => e.type_event === 'perte')
          if (nextPerte) {
            totalHoldMs += new Date(nextPerte.date_irl) - new Date(vpEvts[i].date_irl)
            holdCount++
          }
        }
      }
      
      vpStats[vp.numero] = {
        nom: vp.nom,
        numero: vp.numero,
        prises: prises.length,
        pertes: pertes.length,
        avg_hold_hours: holdCount > 0 ? Math.round((totalHoldMs / holdCount / 3600000) * 10) / 10 : null,
        disputee: prises.length + pertes.length
      }
    }

    // Timeline: day by day
    const dayMap = {}
    events.forEach(e => {
      const day = (e.date_irl || '').slice ? (typeof e.date_irl === 'string' ? e.date_irl.slice(0, 10) : new Date(e.date_irl).toISOString().slice(0, 10)) : ''
      if (!day) return
      if (!dayMap[day]) dayMap[day] = { batailles_all: 0, batailles_us: 0, prises: 0, pertes: 0, sessions: 0 }
      if (e.type_event === 'debut') dayMap[day].sessions++
      if ((e.type_event === 'attaque' || e.type_event === 'defense') && e.camp_vainqueur === 'allemand') dayMap[day].batailles_all++
      if ((e.type_event === 'attaque' || e.type_event === 'defense') && e.camp_vainqueur === 'us') dayMap[day].batailles_us++
      if (e.type_event === 'prise') dayMap[day].prises++
      if (e.type_event === 'perte') dayMap[day].pertes++
    })

    // Compute VP held at end of each day
    const sortedDays = Object.keys(dayMap).sort()
    const vpHeld = new Set()
    const vpEventsAll = events.filter(e => e.type_event === 'prise' || e.type_event === 'perte')
    let vpIdx = 0
    for (const day of sortedDays) {
      while (vpIdx < vpEventsAll.length) {
        const evDay = typeof vpEventsAll[vpIdx].date_irl === 'string' ? vpEventsAll[vpIdx].date_irl.slice(0, 10) : new Date(vpEventsAll[vpIdx].date_irl).toISOString().slice(0, 10)
        if (evDay > day) break
        const vpNum = vpEventsAll[vpIdx].vp_numero || 0
        if (vpEventsAll[vpIdx].type_event === 'prise') vpHeld.add(vpNum)
        if (vpEventsAll[vpIdx].type_event === 'perte') vpHeld.delete(vpNum)
        vpIdx++
      }
      dayMap[day].vp_held = [...vpHeld].sort((a, b) => a - b)
    }

    const sessions = events.filter(e => e.type_event === 'debut').length
    const totalBatailles = batailles.length
    const winAll = att_all + def_all
    const winUs = att_us + def_us
    const totalPrises = events.filter(e => e.type_event === 'prise').length
    const totalPertes = events.filter(e => e.type_event === 'perte').length

    res.json({
      success: true,
      data: {
        sessions,
        batailles: { total: totalBatailles, att_all, att_us, def_all, def_us, win_all: winAll, win_us: winUs },
        vp: { prises: totalPrises, pertes: totalPertes, net: totalPrises - totalPertes },
        vpStats,
        timeline: dayMap,
        vps
      }
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// GET /api/front/correlation — PDS / Front correlation for a period
router.get('/correlation', optionalAuth, async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query
    if (!date_debut || !date_fin) {
      return res.status(400).json({ success: false, message: 'date_debut et date_fin requis (YYYY-MM-DD)' })
    }

    // Find ISO weeks that overlap with the period
    // For each date in range, compute its ISO week
    const start = new Date(date_debut + 'T00:00:00Z')
    const end = new Date(date_fin + 'T23:59:59Z')
    const weeks = new Set()
    const cur = new Date(start)
    while (cur <= end) {
      // Compute ISO week
      const tmp = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate()))
      const dayNum = tmp.getUTCDay() || 7
      tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
      const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7)
      weeks.add(`${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`)
      cur.setUTCDate(cur.getUTCDate() + 1)
    }

    if (weeks.size === 0) {
      return res.json({ success: true, data: { effectifs: [], total_heures: 0, nb_effectifs: 0, nb_events: 0 } })
    }

    const weekList = [...weeks]
    const placeholders = weekList.map(() => '?').join(',')

    // Get PDS data for those weeks (only validated)
    const pdsRows = await query(`
      SELECT p.effectif_id, p.semaine, p.total_heures, p.valide,
             e.nom, e.prenom, g.nom_complet AS grade_nom, u.code AS unite_code
      FROM pds_semaines p
      JOIN effectifs e ON e.id = p.effectif_id
      LEFT JOIN grades g ON g.id = e.grade_id
      LEFT JOIN unites u ON u.id = e.unite_id
      WHERE p.semaine IN (${placeholders}) AND p.valide = 1 AND e.actif = 'Actif'
      ORDER BY u.code, COALESCE(g.rang, 0) DESC
    `, weekList)

    // Get front events count for the period
    const eventsCount = await queryOne(`
      SELECT COUNT(*) AS cnt FROM situation_front_events 
      WHERE DATE(date_irl) >= ? AND DATE(date_irl) <= ?
        AND type_event IN ('attaque', 'defense', 'prise', 'perte')
    `, [date_debut, date_fin])

    // Aggregate per effectif
    const effMap = {}
    pdsRows.forEach(r => {
      if (!effMap[r.effectif_id]) {
        effMap[r.effectif_id] = {
          effectif_id: r.effectif_id,
          nom: r.nom, prenom: r.prenom,
          grade_nom: r.grade_nom, unite_code: r.unite_code,
          total_heures: 0, nb_semaines: 0
        }
      }
      effMap[r.effectif_id].total_heures += parseFloat(r.total_heures) || 0
      effMap[r.effectif_id].nb_semaines++
    })

    const effectifs = Object.values(effMap).sort((a, b) => b.total_heures - a.total_heures)
    const totalHeures = effectifs.reduce((s, e) => s + e.total_heures, 0)

    res.json({
      success: true,
      data: {
        effectifs,
        total_heures: Math.round(totalHeures * 10) / 10,
        nb_effectifs: effectifs.length,
        nb_events: eventsCount?.cnt || 0,
        semaines: weekList
      }
    })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// GET /api/front/events — All events (for commandement charts)
router.get('/events', optionalAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT e.*, c.nom AS carte_nom
      FROM situation_front_events e
      LEFT JOIN situation_front_cartes c ON c.id = e.carte_id
      ORDER BY e.date_irl DESC, e.heure DESC, e.id DESC
      LIMIT 500
    `)
    res.json({ success: true, data: rows })
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur serveur' }) }
})

// POST /api/front/analyse — AI analysis via Groq
router.post('/analyse', optionalAuth, async (req, res) => {
  try {
    const { events, periode, pdsData, combatHours, rapports } = req.body
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ success: false, message: 'events (array) requis' })
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY
    if (!GROQ_API_KEY) {
      return res.status(500).json({ success: false, message: 'GROQ_API_KEY non configuree', fallback: true })
    }

    // Build stats summary for the LLM
    const batailles = events.filter(e => e.type_event === 'attaque' || e.type_event === 'defense')
    const vpEvts = events.filter(e => e.type_event === 'prise' || e.type_event === 'perte')
    const winAll = batailles.filter(e => e.camp_vainqueur === 'allemand').length
    const winUs = batailles.filter(e => e.camp_vainqueur === 'us').length
    const totalBat = winAll + winUs
    const winRate = totalBat > 0 ? Math.round(winAll / totalBat * 100) : 0
    const attaques = batailles.filter(e => e.type_event === 'attaque')
    const defenses = batailles.filter(e => e.type_event === 'defense')
    const attWinAll = attaques.filter(e => e.camp_vainqueur === 'allemand').length
    const defWinAll = defenses.filter(e => e.camp_vainqueur === 'allemand').length
    const prises = vpEvts.filter(e => e.type_event === 'prise').length
    const pertes = vpEvts.filter(e => e.type_event === 'perte').length

    const dataSummary = [
      `Periode: ${periode?.debut || '?'} au ${periode?.fin || '?'}`,
      `Total batailles: ${totalBat} (${attaques.length} attaques, ${defenses.length} defenses)`,
      `Victoires allemandes: ${winAll} (${winRate}% win rate)`,
      `Victoires US: ${winUs}`,
      `Attaques gagnees (ALL): ${attWinAll}/${attaques.length}`,
      `Defenses gagnees (ALL): ${defWinAll}/${defenses.length}`,
      `VP prises: ${prises}, VP perdues: ${pertes}, Bilan net: ${prises - pertes >= 0 ? '+' : ''}${prises - pertes}`,
    ]

    if (pdsData && pdsData.nb_effectifs) {
      dataSummary.push(`Sous-officiers en poste (PDS): ${pdsData.nb_effectifs} sous-officiers, ${pdsData.total_heures}h totales sur ${pdsData.semaines || 0} semaines (ATTENTION: seuls les sous-officiers remplissent les PDS, l'effectif total present est plus important)`)
    }

    // VP detail by number (Fix 3)
    const vpByNumber = {}
    vpEvts.forEach(e => {
      const vpNum = e.vp_numero || e.vp_nom || 'VP?'
      if (!vpByNumber[vpNum]) vpByNumber[vpNum] = { prises: 0, pertes: 0 }
      if (e.type_event === 'prise') vpByNumber[vpNum].prises++
      else vpByNumber[vpNum].pertes++
    })
    const vpDetailLines = Object.entries(vpByNumber).sort((a, b) => {
      const na = parseInt(a[0]) || 99, nb = parseInt(b[0]) || 99
      return na - nb
    }).map(([num, v]) => `  - VP${num}: ${v.prises} prises, ${v.pertes} pertes`)
    if (vpDetailLines.length) dataSummary.push('Detail VP par numero:\n' + vpDetailLines.join('\n'))

    // Combat hours from client (Fix 2)
    if (combatHours) {
      dataSummary.push(`Heures de combat reelles (calculees depuis les events): Total ${combatHours.totalFormatted}, Moyenne par session ${combatHours.avgFormatted} (${combatHours.daysWithCombat} jours de combat, ${combatHours.totalEventsWithHour} events avec heure)`)
    }

    // Map stats
    const mapCount = {}
    events.forEach(e => { const m = e.carte_nom || 'Inconnue'; mapCount[m] = (mapCount[m] || 0) + 1 })
    const mapLines = Object.entries(mapCount).sort((a, b) => b[1] - a[1]).map(([n, c]) => `  - ${n}: ${c} evenements`)
    if (mapLines.length) dataSummary.push('Cartes actives:\n' + mapLines.join('\n'))

    // Time slots
    const slots = { '14-17h': { win: 0, total: 0 }, '17-20h': { win: 0, total: 0 }, '20-23h': { win: 0, total: 0 } }
    batailles.forEach(e => {
      if (!e.heure) return
      const h = parseInt(e.heure.split(':')[0] || e.heure.split('h')[0])
      const slot = h >= 14 && h < 17 ? '14-17h' : h >= 17 && h < 20 ? '17-20h' : h >= 20 && h < 23 ? '20-23h' : null
      if (slot) { slots[slot].total++; if (e.camp_vainqueur === 'allemand') slots[slot].win++ }
    })
    const slotLines = Object.entries(slots).filter(([,v]) => v.total > 0).map(([s, v]) => `  - ${s}: ${v.win}/${v.total} victoires (${Math.round(v.win/v.total*100)}%)`)
    if (slotLines.length) dataSummary.push('Performance par creneau:\n' + slotLines.join('\n'))

    const systemPrompt = `Tu es un analyste militaire RP specialise dans le serveur Garry's Mod DarkRP WWII "LaBaguetteRP".
Tu analyses les donnees de combat du 7e Armeekorps (camp allemand) contre les forces US.
Le contexte est 100% roleplay — ce sont des evenements de jeu, pas de vrais combats.

REGIMENTS DU 7E ARMEEKORPS:
- 916 : Grenadier Regiment (infanterie principale)
- 254 : Feldgendarmerie (police militaire)
- 003 : Fallschirm-Sanitats-Abteilung (medical parachutiste)
- 001 : Marine Pionier Bataillon (marine/genie)
- 919 : Logistik-Abteilung (logistique)
- 130 : Panzer Lehr (blindes)
- 009 : Fallschirmjaeger Regiment (parachutistes)
- 716 : Reserve
- 084 : Armeekorps (etat-major)

HIERARCHIE MILITAIRE:
- Officiers (rang 60-130) : Leutnant -> Oberst -> Generalfeldmarschall — commandement strategique
- Sous-officiers (rang 30-52) : Unteroffizier -> Stabsfeldwebel — encadrement terrain, SEULS a remplir les PDS
- Militaires du rang (rang 5-25) : Schutze -> Obergefreiter — troupe de base
Le Kommander Heer = le sous-officier/officier qui commande l'actif (mentionne dans les rapports)

REGLEMENT DE COMBAT:
${combatRulesContext}

ANALYSE AVANCEE:
- Les prises de VP1 et VP2 se font souvent SANS combat reel (les premiers VP sont souvent non defendus ou pris facilement)
- Un bilan VP positif (+X prises) ne signifie PAS forcement une bonne performance au combat
- Si on a beaucoup de DEFENSES, ca veut dire qu'on se FAIT ATTAQUER souvent, l'ennemi est offensif
- Un bon win rate en defense signifie qu'on resiste bien aux assauts ennemis, PAS qu'on est offensif
- L'efficacite reelle se mesure sur :
  1. Le ratio attaques gagnees vs perdues (capacite offensive)
  2. Le ratio defenses gagnees vs perdues (capacite defensive)
  3. La progression sur les VP avances (VP3, VP4, VP5) qui sont les vrais combats difficiles
  4. Le temps de tenue des VP apres capture (rapide perte = mauvais signe)
- Les batailles (attaque/defense de base) sont le vrai indicateur de force, pas les mouvements VP
- Correlation PDS : les PDS sont remplis uniquement par les SOUS-OFFICIERS (pas tous les effectifs). Ca donne une idee de la presence du commandement, pas de l'effectif total present
- Si le detail VP par numero montre beaucoup de VP1/VP2 mais peu de VP3+, ca signifie qu'on ne progresse pas au-dela des premiers objectifs faciles
- Les prises synchro (VP1/VP2 en debut d'actif ou apres attaque/defense) sont DEJA exclues des stats, ne pas les recompter
- Contexte RP : c'est le 7e Armeekorps (camp allemand Heer) sur le serveur LaBaguetteRP (Garry's Mod DarkRP WWII). Les US sont l'ennemi.
- Chaque session de combat dure generalement 2-4h, le vendredi/samedi soir principalement
- Le commandement = Kommander Heer + ses officiers/sous-officiers. Les rapports de front mentionnent souvent qui commandait

RAPPORTS:
Si des rapports sont fournis, les analyser pour :
- Identifier qui commandait (Kommander Heer) et avec quel effectif
- Extraire les observations terrain (discipline, materiel, inegalite de troupes)
- Correler avec les stats : si un rapport mentionne "indiscipline" et le win rate est bas, le signaler
- Faire une synthese narrative des rapports : resumer ce qui s'est passe en 3-4 phrases
- NE JAMAIS inventer, seulement citer ce qui est ecrit dans les rapports

REGLES STRICTES:
- Ne JAMAIS inventer de donnees, ne baser l'analyse QUE sur ce qui est fourni
- Si une donnee manque, le signaler clairement ("Donnee non disponible")
- Les prises synchro VP1/VP2 sont DEJA exclues des stats, ne pas les recompter
- Les PDS ne refletent que les sous-officiers, PAS l'effectif total

CONSIGNES:
- Analyse les donnees fournies de maniere structuree et analytique
- Utilise le reglement pour contextualiser (ex: si beaucoup de VP perdues, c'est peut-etre un probleme de tenue post-capture)
- Prends en compte les heures de combat reelles si fournies pour evaluer l'intensite des sessions
- Sois concis mais precis
- Pas de caracteres speciaux allemands (pas de umlauts)
- Reponds en francais
- Format STRICT:

PROFIL TACTIQUE: [offensif/defensif/equilibre] - [explication courte]
PERFORMANCE: [analyse du win rate, tendances]
POINTS FORTS:
- [point 1]
- [point 2]
POINTS FAIBLES:
- [point 1]
- [point 2]
SUGGESTIONS:
- [suggestion 1]
- [suggestion 2]
RESUME: [2-3 phrases de synthese]`

    // Add rapports if provided
    if (rapports && Array.isArray(rapports) && rapports.length > 0) {
      dataSummary.push(`\nRAPPORTS DE LA PERIODE (${rapports.length}):`)
      rapports.forEach((r, i) => {
        const parts = [`Rapport ${i + 1}: "${r.titre || 'Sans titre'}" par ${r.auteur_grade || ''} ${r.auteur_nom || 'Inconnu'} (${r.date_irl || '?'})`]
        if (r.contexte) parts.push(`  Contexte: ${r.contexte}`)
        if (r.resume) parts.push(`  Resume: ${r.resume}`)
        if (r.bilan) parts.push(`  Bilan: ${r.bilan}`)
        if (r.remarques) parts.push(`  Remarques: ${r.remarques}`)
        if (r.conclusion) parts.push(`  Conclusion: ${r.conclusion}`)
        dataSummary.push(parts.join('\n'))
      })
    }

    const userMessage = `Voici les donnees de combat pour la periode:\n\n${dataSummary.join('\n')}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 800,
        temperature: 0.3
      }),
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error(`[Groq] API error ${response.status}: ${errText}`)
      return res.json({ success: false, message: `Groq API error: ${response.status}`, fallback: true })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    if (!content) {
      return res.json({ success: false, message: 'Reponse vide de Groq', fallback: true })
    }

    res.json({ success: true, data: { analysis: content, model: data.model, usage: data.usage } })
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[Groq] Request timeout')
      return res.json({ success: false, message: 'Timeout Groq API (15s)', fallback: true })
    }
    console.error('[Groq] Error:', err.message)
    res.json({ success: false, message: err.message, fallback: true })
  }
})

// GET /api/front/rapports — Rapports valides pour une periode
router.get('/rapports', optionalAuth, async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query
    if (!date_debut || !date_fin) {
      return res.status(400).json({ success: false, message: 'date_debut et date_fin requis (YYYY-MM-DD)' })
    }

    const rows = await query(`
      SELECT r.id, r.titre, r.auteur_nom, r.auteur_grade, r.date_irl, r.date_rp,
             LEFT(r.contexte, 500) AS contexte,
             LEFT(r.resume, 500) AS resume,
             LEFT(r.bilan, 500) AS bilan,
             LEFT(r.remarques, 500) AS remarques,
             LEFT(r.conclusion, 500) AS conclusion
      FROM rapports r
      WHERE r.valide = 1
        AND DATE(r.date_irl) >= ? AND DATE(r.date_irl) <= ?
      ORDER BY r.date_irl DESC
    `, [date_debut, date_fin])

    res.json({ success: true, data: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

module.exports = router
