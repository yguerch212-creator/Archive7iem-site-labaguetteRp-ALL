const router = require('express').Router()
const auth = require('../middleware/auth')
const config = require('../config/env')

// POST /api/discord/notify — Send DM via Discord bot
// Called internally after effectif creation if discord_id is set
// Bot token configured via DISCORD_BOT_TOKEN env var
router.post('/notify', auth, async (req, res) => {
  try {
    const { discord_id, message } = req.body
    if (!discord_id || !message) {
      return res.status(400).json({ success: false, message: 'discord_id et message requis' })
    }

    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      return res.json({ success: false, message: 'Bot Discord non configuré (DISCORD_BOT_TOKEN manquant)', skipped: true })
    }

    // Create DM channel
    const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: { 'Authorization': `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: discord_id })
    })
    if (!dmRes.ok) {
      const err = await dmRes.text()
      return res.status(400).json({ success: false, message: `Impossible d'ouvrir le DM: ${err}` })
    }
    const dm = await dmRes.json()

    // Send message
    const msgRes = await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    })
    if (!msgRes.ok) {
      const err = await msgRes.text()
      return res.status(400).json({ success: false, message: `Erreur envoi message: ${err}` })
    }

    res.json({ success: true, message: 'DM envoyé' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
