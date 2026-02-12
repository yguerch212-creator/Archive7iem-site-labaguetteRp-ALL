const { validationResult } = require('express-validator')

function handleValidation(req, res, next) {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }))

    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errorMessages
    })
  }

  next()
}

module.exports = {
  handleValidation
}