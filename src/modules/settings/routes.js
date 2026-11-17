const express = require('express')
const router = express.Router()
const { requireAuth, requireAdmin } = require('../../middleware/authentication')
const { issueCsrfToken, csrfMiddleware } = require('../../middleware/csrf')
const { asyncHandler } = require('../../utils/asyncHandler')
const ctrl = require('./controller')

router.get('/api/settings', requireAuth, asyncHandler(ctrl.listSettings))
router.get('/api/settings/:key', requireAuth, asyncHandler(ctrl.getSetting))
router.put('/api/settings/:key', requireAuth, requireAdmin, issueCsrfToken, csrfMiddleware, asyncHandler(ctrl.updateSetting))

module.exports = router
