const router = require('express').Router()
const auth = require('../middleware/auth')
const { login, logout, getMe, changePassword } = require('../controllers/auth.controller')

router.post('/login', login)
router.post('/logout', auth, logout)
router.get('/me', auth, getMe)
router.put('/change-password', auth, changePassword)

module.exports = router
