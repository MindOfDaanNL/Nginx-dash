const express = require('express')
const helmet = require('helmet')
const { execFile } = require('child_process')
const path = require('path')
const fs = require('fs').promises

const TOKEN = process.env.NGINX_HELPER_TOKEN || 'change-me-helper-token'
const NGINX_BIN = process.env.NGINX_BIN || '/usr/sbin/nginx'
const CERTBOT_BIN = process.env.CERTBOT_BIN || '/usr/bin/certbot'
const SITES_AVAILABLE = process.env.NGINX_SITES_AVAILABLE || '/etc/nginx/sites-available'
const SITES_ENABLED = process.env.NGINX_SITES_ENABLED || '/etc/nginx/sites-enabled'

const MAX_OUTPUT = 1024 * 1024
const TIMEOUT = 30000

const app = express()
app.use(helmet())
app.use(express.json())

function auth(req, res, next) {
  const authz = req.headers.authorization || ''
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : ''
  if (token !== TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

function isSafePath(filePath, allowedDirs) {
  const resolved = path.resolve(filePath)
  return allowedDirs.some((dir) => resolved.startsWith(path.resolve(dir) + path.sep) || resolved === path.resolve(dir))
}

function validateFilename(name) {
  return /^[a-z0-9._-]+$/i.test(name) && !name.includes('..') && !path.isAbsolute(name)
}

function validateDomain(domain) {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(domain)
}

async function run(binary, args, timeout = TIMEOUT) {
  return new Promise((resolve) => {
    execFile(binary, args, { timeout, maxBuffer: MAX_OUTPUT, env: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin' } }, (err, stdout, stderr) => {
      resolve({
        success: !err,
        code: err ? (err.code || -1) : 0,
        stdout: stdout || '',
        stderr: err ? (err.stderr || err.message || '') : (stderr || ''),
        signal: err ? err.signal : null,
      })
    })
  })
}

app.use(auth)

// Nginx config test
app.post('/nginx/test', async (req, res) => {
  const r = await run(NGINX_BIN, ['-t'])
  res.json(r)
})

// Nginx reload
app.post('/nginx/reload', async (req, res) => {
  const r = await run(NGINX_BIN, ['-s', 'reload'])
  res.json(r)
})

// Nginx service action
app.post('/nginx/service/:action', async (req, res) => {
  const { action } = req.params
  if (!['start', 'stop', 'restart', 'reload', 'status'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' })
  }
  const args = action === 'status' ? ['status', 'nginx', '--no-pager'] : [action, 'nginx']
  const r = await run('systemctl', args)
  res.json(r)
})

// Write config file
app.post('/configs/write', async (req, res) => {
  const { filename, content } = req.body || {}
  if (!validateFilename(filename)) {
    return res.status(400).json({ error: 'Invalid filename' })
  }
  const fullPath = path.join(SITES_AVAILABLE, filename)
  if (!isSafePath(fullPath, [SITES_AVAILABLE])) {
    return res.status(403).json({ error: 'Path traversal' })
  }
  try {
    await fs.writeFile(fullPath, content, 'utf8')
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete config file
app.post('/configs/delete', async (req, res) => {
  const { filename } = req.body || {}
  if (!validateFilename(filename)) {
    return res.status(400).json({ error: 'Invalid filename' })
  }
  const fullPath = path.join(SITES_AVAILABLE, filename)
  if (!isSafePath(fullPath, [SITES_AVAILABLE])) {
    return res.status(403).json({ error: 'Path traversal' })
  }
  try {
    await fs.unlink(fullPath)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Manage symlink
app.post('/configs/symlink', async (req, res) => {
  const { filename, enable } = req.body || {}
  if (!validateFilename(filename)) {
    return res.status(400).json({ error: 'Invalid filename' })
  }
  const target = path.join(SITES_AVAILABLE, filename)
  const link = path.join(SITES_ENABLED, filename)
  if (!isSafePath(target, [SITES_AVAILABLE]) || !isSafePath(link, [SITES_ENABLED])) {
    return res.status(403).json({ error: 'Path traversal' })
  }
  try {
    if (enable) {
      try { await fs.symlink(target, link) } catch (err) { if (err.code !== 'EEXIST') throw err }
    } else {
      try { await fs.unlink(link) } catch (err) { if (err.code !== 'ENOENT') throw err }
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Certbot request
app.post('/certbot/request', async (req, res) => {
  const { domains = [], email } = req.body || {}
  for (const d of domains) {
    if (!validateDomain(d)) {
      return res.status(400).json({ error: `Invalid domain: ${d}` })
    }
  }
  const args = ['--nginx', ...domains.flatMap((d) => ['-d', d]), '-m', email || '', '--agree-tos', '--non-interactive', '--redirect']
  const r = await run(CERTBOT_BIN, args, 120000)
  res.json(r)
})

// Certbot renew
app.post('/certbot/renew', async (req, res) => {
  const { dryRun = false } = req.body || {}
  const args = ['renew', ...(dryRun ? ['--dry-run'] : [])]
  const r = await run(CERTBOT_BIN, args, 120000)
  res.json(r)
})

// Certbot certificates list
app.post('/certbot/certificates', async (req, res) => {
  const r = await run(CERTBOT_BIN, ['certificates'])
  res.json(r)
})

const PORT = process.env.NGINX_HELPER_PORT || 4011
app.listen(PORT, () => {
  console.log(`[nginx-helper] Privileged helper listening on :${PORT}`)
})

module.exports = app
