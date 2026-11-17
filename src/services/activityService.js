const { query } = require('../config/database')

async function logActivity({ userId, username, action, description, ipAddress, status, errorInfo }) {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, username, action, description, ip_address, status, error_info, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, username, action, description, ipAddress, status, errorInfo || null]
    )
  } catch (err) {
    console.error('Failed to write activity log:', err.message)
  }
}

async function getLogs({ page = 1, limit = 50, action, username, status } = {}) {
  let sql = `SELECT al.id, al.user_id, al.username, al.action, al.description, al.ip_address, al.status, al.error_info, al.created_at
             FROM activity_logs al`
  const params = []
  const conditions = []

  if (action) {
    conditions.push('al.action = ?')
    params.push(action)
  }
  if (username) {
    conditions.push('al.username = ?')
    params.push(username)
  }
  if (status) {
    conditions.push('al.status = ?')
    params.push(status)
  }

  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?'
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10)
  params.push(parseInt(limit, 10), offset)

  const rows = await query(sql, params)
  const [countResult] = await query(
    `SELECT COUNT(*) AS total FROM activity_logs al${conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''}`,
    conditions.length ? params.slice(0, -2) : undefined
  )

  return {
    logs: rows,
    total: countResult ? countResult.total : 0,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  }
}

module.exports = {
  logActivity,
  getLogs,
}
