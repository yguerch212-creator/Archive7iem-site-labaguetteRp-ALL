// Allows admin, officier, administratif (recenseur), état-major
module.exports = function privileged(req, res, next) {
  if (!req.user || !(req.user.isAdmin || req.user.isOfficier || req.user.isRecenseur || req.user.isEtatMajor)) {
    return res.status(403).json({ success: false, message: 'Accès refusé — droits insuffisants' })
  }
  next()
}
