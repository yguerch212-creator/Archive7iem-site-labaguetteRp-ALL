module.exports = function admin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ success: false, message: 'Accès refusé — droits administrateur requis' })
  }
  next()
}
