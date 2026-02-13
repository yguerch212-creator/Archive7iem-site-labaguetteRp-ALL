/**
 * Discord channel notification helper
 * Posts embeds to DISCORD_NOTIFICATION_CHANNEL_ID when events happen
 */

const COLORS = {
  rapport: 0x6b8f3c,    // military green
  telegramme: 0xf1c40f,  // gold
  interdit: 0xe74c3c,    // red
  medical: 0x3498db,     // blue
  affaire: 0x8e44ad,     // purple
  effectif: 0x2ecc71,    // green
  decoration: 0xf39c12,  // orange
}

async function notifyChannel(embed) {
  const botToken = process.env.DISCORD_BOT_TOKEN
  const channelId = process.env.DISCORD_NOTIFICATION_CHANNEL_ID
  if (!botToken || !channelId) return // silently skip if not configured

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    })
    if (!res.ok) {
      console.error('[Discord Notify]', res.status, await res.text().catch(() => ''))
    }
  } catch (err) {
    console.error('[Discord Notify] Error:', err.message)
  }
}

// Notify: new rapport
function notifyRapport(rapport, auteur) {
  const typeLabels = { rapport: '📜 Rapport Journalier', recommandation: '⭐ Recommandation', incident: '🚨 Incident' }
  return notifyChannel({
    title: typeLabels[rapport.type] || '📜 Nouveau Rapport',
    description: rapport.titre || 'Sans titre',
    color: COLORS.rapport,
    fields: [
      { name: 'Auteur', value: auteur || 'Inconnu', inline: true },
      { name: 'N°', value: rapport.numero || '—', inline: true },
      { name: 'Date RP', value: rapport.date_rp || '—', inline: true },
    ],
    footer: { text: 'Archives 7e Armeekorps' },
    timestamp: new Date().toISOString()
  })
}

// Notify: new telegram
function notifyTelegramme(tel) {
  const priorityEmojis = { Normal: '📨', Urgent: '🔴', Secret: '🔒', 'Sehr Geheim': '☠️' }
  return notifyChannel({
    title: `${priorityEmojis[tel.priorite] || '📨'} Télégramme ${tel.numero || ''}`,
    description: tel.prive ? '🔒 Télégramme privé' : (tel.objet || 'Sans objet'),
    color: tel.priorite === 'Urgent' ? 0xe74c3c : tel.priorite === 'Secret' ? 0x95a5a6 : tel.priorite === 'Sehr Geheim' ? 0x2c2c2c : COLORS.telegramme,
    fields: [
      { name: 'De', value: tel.expediteur_nom || 'Inconnu', inline: true },
      { name: 'À', value: tel.destinataire_nom || 'Inconnu', inline: true },
      { name: 'Priorité', value: tel.priorite, inline: true },
    ],
    footer: { text: 'Archives 7e Armeekorps' },
    timestamp: new Date().toISOString()
  })
}

// Notify: interdit de front
function notifyInterdit(interdit) {
  return notifyChannel({
    title: '🚫 Interdit de Front',
    description: interdit.motif || 'Aucun motif',
    color: COLORS.interdit,
    fields: [
      { name: 'Effectif', value: interdit.effectif_nom || 'Inconnu', inline: true },
      { name: 'Type', value: interdit.type || '—', inline: true },
      { name: 'Ordonné par', value: interdit.ordonne_par || 'Inconnu', inline: true },
    ],
    footer: { text: 'Archives 7e Armeekorps' },
    timestamp: new Date().toISOString()
  })
}

// Notify: new affaire
function notifyAffaire(affaire) {
  return notifyChannel({
    title: '⚖️ Nouvelle Affaire Judiciaire',
    description: affaire.titre || 'Sans titre',
    color: COLORS.affaire,
    fields: [
      { name: 'N°', value: affaire.numero || '—', inline: true },
      { name: 'Type', value: affaire.type || '—', inline: true },
      { name: 'Gravité', value: affaire.gravite || '—', inline: true },
    ],
    footer: { text: 'Archives 7e Armeekorps' },
    timestamp: new Date().toISOString()
  })
}

// Notify: new visite medicale
function notifyMedical(visite) {
  return notifyChannel({
    title: '🏥 Visite Médicale',
    description: `Aptitude : ${visite.aptitude || '—'}`,
    color: COLORS.medical,
    fields: [
      { name: 'Patient', value: visite.effectif_nom || 'Inconnu', inline: true },
      { name: 'Médecin', value: visite.medecin_nom || 'Inconnu', inline: true },
    ],
    footer: { text: 'Archives 7e Armeekorps' },
    timestamp: new Date().toISOString()
  })
}

// Notify: new effectif
function notifyEffectif(eff) {
  return notifyChannel({
    title: '🆕 Nouvel Effectif',
    description: `${eff.prenom} ${eff.nom}`,
    color: COLORS.effectif,
    fields: [
      { name: 'Grade', value: eff.grade_nom || '—', inline: true },
      { name: 'Unité', value: eff.unite_nom || '—', inline: true },
    ],
    footer: { text: 'Archives 7e Armeekorps' },
    timestamp: new Date().toISOString()
  })
}

// Notify: interdit levé
function notifyInterditLeve(interdit) {
  return notifyChannel({
    title: '✅ Interdit de Front Levé',
    description: interdit.motif_levee || 'Pas de motif',
    color: 0x2ecc71,
    fields: [
      { name: 'Effectif', value: interdit.effectif_nom || 'Inconnu', inline: true },
      { name: 'Levé par', value: interdit.leve_par || 'Inconnu', inline: true },
    ],
    footer: { text: 'Archives 7e Armeekorps' },
    timestamp: new Date().toISOString()
  })
}

module.exports = {
  notifyChannel,
  notifyRapport,
  notifyTelegramme,
  notifyInterdit,
  notifyInterditLeve,
  notifyAffaire,
  notifyMedical,
  notifyEffectif,
}
