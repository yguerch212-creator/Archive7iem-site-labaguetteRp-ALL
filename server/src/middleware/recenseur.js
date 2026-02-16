// Allows Admin OR Administratif — for RP management routes
module.exports = function recenseur(req, res, next) {
  if (!req.user || (!req.user.isAdmin && !req.user.isRecenseur)) {
    return res.status(403).json({ success: false, message: 'Accès refusé — droits administratif ou administrateur requis' })
  }
  next()
}
