const express = require('express')
const router = express.Router()
const { requireAuth, requireAdmin, setUserLocals } = require('../../middleware/authentication')
const { issueCsrfToken, csrfMiddleware } = require('../../middleware/csrf')
const { asyncHandler } = require('../../utils/asyncHandler')
const auth = require('./controller')

router.use(setUserLocals)

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/')
  res.render('auth/login', { title: 'Login', csrfToken: req.session.csrfToken })
})

router.post('/api/auth/login', asyncHandler(auth.login))
router.post('/api/auth/logout', requireAuth, asyncHandler(auth.logout))
router.get('/api/auth/me', requireAuth, asyncHandler(auth.me))

router.get('/api/users', requireAuth, requireAdmin, asyncHandler(auth.listUsers))
router.post('/api/users', requireAuth, requireAdmin, issueCsrfToken, csrfMiddleware, asyncHandler(auth.createUser))
router.put('/api/users/:id', requireAuth, requireAdmin, issueCsrfToken, csrfMiddleware, asyncHandler(auth.updateUser))
router.delete('/api/users/:id', requireAuth, requireAdmin, csrfMiddleware, asyncHandler(auth.deleteUser))
router.post('/api/users/:id/reset-password', requireAuth, requireAdmin, issueCsrfToken, csrfMiddleware, asyncHandler(auth.resetPassword))

module.exports = router
