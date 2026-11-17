const express = require('express')
const router = express.Router()
const { requireAuth, requireAdmin } = require('../../middleware/authentication')
const activityService = require('../../services/activityService')
const { asyncHandler } = require('../../utils/asyncHandler')

router.get('/api/logs', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, username, status } = req.query
  const result = await activityService.getLogs({ page, limit, action, username, status })
  return res.json(result)
}))

router.get('/api/logs/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const rows = await activityService.getLogs({ page: 1, limit: 1 })
  const log = rows.logs.find((l) => String(l.id) === id)
  if (!log) {
    return res.status(404).json({ error: 'Log entry not found' })
  }
  return res.json({ log })
}))

module.exports = router
