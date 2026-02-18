// Allows Admin, Officier, or Feldgendarmerie (unite 254) users
// Used for: interdit de front, casier judiciaire
module.exports = function feldgendarmerie(req, res, next) {
  if (!req.user) {
    return res.status(403).json({ success: false, message: 'Accès refusé' })
  }
  
  const { isAdmin, isOfficier, isFeldgendarmerie } = req.user
  
  if (isAdmin || isOfficier || isFeldgendarmerie) {
    return next()
  }
  
  return res.status(403).json({ success: false, message: 'Accès réservé — Feldgendarmerie, officiers ou administrateurs uniquement' })
}
