const { query } = require('../../config/database')

const SENSITIVE_KEYS = new Set([
  'db_password',
  'session_secret',
  'nginx_helper_token',
])

async function listSettings(req, res) {
  const rows = await query('SELECT setting_key, setting_value, updated_at FROM settings ORDER BY setting_key')
  const settings = rows.map((r) => ({
    key: r.setting_key,
    value: SENSITIVE_KEYS.has(r.setting_key) ? '***masked***' : r.setting_value,
    sensitive: SENSITIVE_KEYS.has(r.setting_key),
    updatedAt: r.updated_at,
  }))
  return res.json({ settings })
}

async function getSetting(req, res) {
  const { key } = req.params
  const row = (await query('SELECT setting_key, setting_value, updated_at FROM settings WHERE setting_key = ?', [key]))[0]
  if (!row) {
    return res.status(404).json({ error: 'Setting not found' })
  }
  return res.json({
    key: row.setting_key,
    value: SENSITIVE_KEYS.has(row.setting_key) ? '***masked***' : row.setting_value,
    sensitive: SENSITIVE_KEYS.has(row.setting_key),
    updatedAt: row.updated_at,
  })
}

async function updateSetting(req, res) {
  const { key } = req.params
  const { value } = req.body || {}
  if (value === undefined) {
    return res.status(400).json({ error: 'Value is required' })
  }

  await query(
    'INSERT INTO settings (setting_key, setting_value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()',
    [key, value]
  )

  return res.json({ key, value: SENSITIVE_KEYS.has(key) ? '***masked***' : value, updatedAt: new Date() })
}

module.exports = {
  SENSITIVE_KEYS,
  listSettings,
  getSetting,
  updateSetting,
}
