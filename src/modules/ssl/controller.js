const { query } = require('../../config/database')
const certbotService = require('../../services/certbotService')
const { logActivity } = require('../../services/activityService')

async function listCertificates(req, res) {
  const rows = await query('SELECT * FROM ssl_certificates ORDER BY created_at DESC')
  return res.json({ certificates: rows })
}

async function getCertificate(req, res) {
  const { id } = req.params
  const row = (await query('SELECT * FROM ssl_certificates WHERE id = ?', [id]))[0]
  if (!row) {
    return res.status(404).json({ error: 'Certificate not found' })
  }
  return res.json({ certificate: row })
}

async function requestCertificate(req, res) {
  const actor = req.session.user
  const { domain, additionalDomains, email } = req.body || {}
  if (!domain || !email) {
    return res.status(400).json({ error: 'Domain and email are required' })
  }

  const domains = [domain, ...(additionalDomains || [])].filter(Boolean)
  for (const d of domains) {
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(d)) {
      return res.status(400).json({ error: `Invalid domain: ${d}` })
    }
  }

  const result = await certbotService.requestCertificate(domains, email || req.app.locals.defaultLeEmail)
  if (!result.success) {
    await logActivity({
      userId: actor.id,
      username: actor.username,
      action: 'ssl_request_failed',
      description: `Certbot request failed for ${domains.join(', ')}`,
      ipAddress: req.ip,
      status: 'failure',
      errorInfo: result.stderr,
    })
    return res.status(400).json({ error: 'Certificate request failed', details: result.stderr })
  }

  const certName = domains[0]
  const [inserted] = await query(
    'INSERT INTO ssl_certificates (certificate_name, domains, issuer, issued_at, expires_at, certificate_path, status, created_at, updated_at) VALUES (?, ?, "Let\'s Encrypt", NOW(), NULL, ?, "active", NOW(), NOW())',
    [certName, JSON.stringify(domains), `/etc/letsencrypt/live/${certName}`]
  )

  await logActivity({
    userId: actor.id,
    username: actor.username,
    action: 'ssl_requested',
    description: `SSL certificate requested for ${domains.join(', ')}`,
    ipAddress: req.ip,
    status: 'success',
  })

  return res.status(201).json({ certificateId: inserted.insertId, output: result.stdout })
}

async function renewCertificate(req, res) {
  const actor = req.session.user
  const { dryRun = false } = req.body || {}

  const result = await certbotService.renewCertificate(dryRun === true)

  await logActivity({
    userId: actor.id,
    username: actor.username,
    action: dryRun ? 'ssl_renew_test' : 'ssl_renewed',
    description: dryRun ? 'SSL renewal dry-run executed' : 'SSL certificates renewed',
    ipAddress: req.ip,
    status: result.success ? 'success' : 'failure',
    errorInfo: result.success ? null : result.stderr,
  })

  return res.json({ success: result.success, output: result.stdout, error: result.stderr })
}

async function deleteCertificate(req, res) {
  const { id } = req.params
  const actor = req.session.user

  const row = (await query('SELECT * FROM ssl_certificates WHERE id = ?', [id]))[0]
  if (!row) {
    return res.status(404).json({ error: 'Certificate not found' })
  }

  await query('DELETE FROM ssl_certificates WHERE id = ?', [id])
  await logActivity({
    userId: actor.id,
    username: actor.username,
    action: 'ssl_removed',
    description: `SSL certificate ${row.certificate_name} removed`,
    ipAddress: req.ip,
    status: 'success',
  })

  return res.json({ message: 'Certificate removed' })
}

module.exports = {
  listCertificates,
  getCertificate,
  requestCertificate,
  renewCertificate,
  deleteCertificate,
}
