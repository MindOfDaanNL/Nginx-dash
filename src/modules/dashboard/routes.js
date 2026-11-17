const express = require('express')
const router = express.Router()
const { requireAuth } = require('../../middleware/authentication')
const { asyncHandler } = require('../../utils/asyncHandler')
const ctrl = require('./controller')

router.get('/api/dashboard/stats', requireAuth, asyncHandler(ctrl.getStats))
router.get('/api/dashboard/activity', requireAuth, asyncHandler(ctrl.getActivity))

module.exports = router
