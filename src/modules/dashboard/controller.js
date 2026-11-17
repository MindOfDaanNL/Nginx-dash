const { query } = require('../../config/database')
const systemService = require('../../services/systemService')
const { logActivity } = require('../../services/activityService')

async function getStats(req, res) {
  const user = req.session.user
  const [configCount] = await query('SELECT COUNT(*) AS c FROM nginx_configurations')
  const [enabledCount] = await query('SELECT COUNT(*) AS c FROM nginx_configurations WHERE enabled = 1')
  const [sslCount] = await query('SELECT COUNT(*) AS c FROM ssl_certificates WHERE status = \'active\'')
  const [expiringSoon] = await query(
    'SELECT COUNT(*) AS c FROM ssl_certificates WHERE expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)'
  )
  const [expired] = await query('SELECT COUNT(*) AS c FROM ssl_certificates WHERE expires_at < NOW()')

  const nginxStatus = await systemService.getStatus()

  const stats = {
    totalConfigs: parseInt(configCount.c, 10),
    enabledConfigs: parseInt((await enabledCount).c, 10),
    disabledConfigs: parseInt(configCount.c, 10) - parseInt((await enabledCount).c, 10),
    activeSsl: parseInt(sslCount.c, 10),
    expiringSoon: parseInt(expiringSoon.c, 10),
    expired: parseInt(expired.c, 10),
    nginx: nginxStatus,
  }

  await logActivity({
    userId: user.id,
    username: user.username,
    action: 'dashboard_view',
    description: 'Dashboard viewed',
    ipAddress: req.ip,
    status: 'success',
  })

  return res.json({ stats })
}

async function getActivity(req, res) {
  const { limit = 10 } = req.query

  const rows = await query(
    `SELECT id, username, action, description, status, created_at
     FROM activity_logs
     ORDER BY created_at DESC
     LIMIT ?`,
    [parseInt(limit, 10)]
  )

  return res.json({ activity: rows })
}

module.exports = {
  getStats,
  getActivity,
}
