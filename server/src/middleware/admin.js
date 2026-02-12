function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise'
    })
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Accès administrateur requis'
    })
  }

  next()
}

function requireGroup(groupName) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      })
    }

    if (!req.user.groups.includes(groupName)) {
      return res.status(403).json({
        success: false,
        message: `Appartenance au groupe '${groupName}' requise`
      })
    }

    next()
  }
}

module.exports = {
  requireAdmin,
  requireGroup
}