const path = require('path')
const config = require('../config/environment')

const MAX_OUTPUT = 1024 * 1024
const DEFAULT_TIMEOUT = 30000

const ALLOWED_NGINX_BIN = config.nginx.bin
const ALLOWED_CERTBOT_BIN = config.certbot.bin

function isSafePath(filePath, allowedDirs) {
  const resolved = path.resolve(filePath)
  return allowedDirs.some((dir) => resolved.startsWith(path.resolve(dir) + path.sep) || resolved === path.resolve(dir))
}

function validateDomain(domain) {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(domain)
}

function validateFilename(name) {
  return /^[a-z0-9._-]+$/i.test(name) && !name.includes('..') && !path.isAbsolute(name)
}

async function runCommand(binary, args, options = {}) {
  const timeout = options.timeout || DEFAULT_TIMEOUT
  const { execFile } = require('child_process')
  return new Promise((resolve) => {
    execFile(binary, args, {
      timeout,
      maxBuffer: MAX_OUTPUT,
      env: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', ...process.env },
    }, (err, stdout, stderr) => {
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

async function helperRequest(endpoint, body) {
  if (!config.helper.url || !config.helper.token) {
    throw new Error('Privileged helper not configured')
  }
  const res = await fetch(`${config.helper.url}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.helper.token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Helper error ${res.status}: ${txt}`)
  }
  return res.json()
}

function useHelper() {
  return Boolean(config.helper.url && config.helper.token && config.helper.token !== 'change-me-helper-token')
}

async function testNginxConfig() {
  if (useHelper()) return helperRequest('/nginx/test')
  return runCommand(ALLOWED_NGINX_BIN, ['-t'])
}

async function reloadNginx() {
  if (useHelper()) return helperRequest('/nginx/reload')
  return runCommand(ALLOWED_NGINX_BIN, ['-s', 'reload'])
}

async function nginxStatus() {
  if (useHelper()) return helperRequest('/nginx/service/status')
  return runCommand('systemctl', ['status', 'nginx', '--no-pager', '--full'])
}

async function nginxAction(action) {
  const allowed = ['start', 'stop', 'restart', 'reload']
  if (!allowed.includes(action)) {
    return { success: false, stderr: 'Invalid nginx action', code: -1 }
  }
  if (useHelper()) return helperRequest('/nginx/service/' + action)
  return runCommand('systemctl', [action, 'nginx'])
}

async function writeConfigFile(filename, content, sitesDir) {
  if (!validateFilename(filename)) {
    return { success: false, stderr: 'Invalid filename', code: -1 }
  }
  const fullPath = path.join(sitesDir, filename)
  if (!isSafePath(fullPath, [sitesDir])) {
    return { success: false, stderr: 'Path traversal detected', code: -1 }
  }
  if (useHelper()) {
    return helperRequest('/configs/write', { filename, content })
  }
  const fs = require('fs').promises
  await fs.writeFile(fullPath, content, 'utf8')
  return { success: true }
}

async function readConfigFile(filename, sitesDir) {
  if (!validateFilename(filename)) {
    return { success: false, stderr: 'Invalid filename', code: -1 }
  }
  const fullPath = path.join(sitesDir, filename)
  if (!isSafePath(fullPath, [sitesDir])) {
    return { success: false, stderr: 'Path traversal detected', code: -1 }
  }
  const fs = require('fs').promises
  try {
    const content = await fs.readFile(fullPath, 'utf8')
    return { success: true, content }
  } catch (err) {
    return { success: false, stderr: err.message, code: err.code }
  }
}

async function deleteConfigFile(filename, sitesDir) {
  if (!validateFilename(filename)) {
    return { success: false, stderr: 'Invalid filename', code: -1 }
  }
  const fullPath = path.join(sitesDir, filename)
  if (!isSafePath(fullPath, [sitesDir])) {
    return { success: false, stderr: 'Path traversal detected', code: -1 }
  }
  if (useHelper()) {
    return helperRequest('/configs/delete', { filename })
  }
  const fs = require('fs').promises
  try {
    await fs.unlink(fullPath)
    return { success: true }
  } catch (err) {
    return { success: false, stderr: err.message, code: err.code }
  }
}

async function manageSymlink(filename, enable, sitesAvailable, sitesEnabled) {
  if (!validateFilename(filename)) {
    return { success: false, stderr: 'Invalid filename', code: -1 }
  }
  if (useHelper()) {
    return helperRequest('/configs/symlink', { filename, enable })
  }
  const fs = require('fs').promises
  const target = path.join(sitesAvailable, filename)
  const link = path.join(sitesEnabled, filename)
  if (!isSafePath(target, [sitesAvailable]) || !isSafePath(link, [sitesEnabled])) {
    return { success: false, stderr: 'Path traversal detected', code: -1 }
  }
  if (enable) {
    try {
      await fs.symlink(target, link)
      return { success: true }
    } catch (err) {
      if (err.code === 'EEXIST') return { success: true }
      return { success: false, stderr: err.message, code: err.code }
    }
  } else {
    try {
      await fs.unlink(link)
      return { success: true }
    } catch (err) {
      if (err.code === 'ENOENT') return { success: true }
      return { success: false, stderr: err.message, code: err.code }
    }
  }
}

async function certbotRequest(domains, email, options = {}) {
  const args = ['--nginx']
  for (const d of domains) {
    if (!validateDomain(d)) {
      return { success: false, stderr: `Invalid domain: ${d}`, code: -1 }
    }
    args.push('-d', d)
  }
  if (email) {
    args.push('-m', email)
  }
  args.push('--agree-tos', '--non-interactive', '--redirect')
  if (options.dryRun) args.push('--dry-run')

  if (useHelper()) {
    return helperRequest('/certbot/request', { domains, email })
  }
  return runCommand(ALLOWED_CERTBOT_BIN, args, { timeout: 120000 })
}

async function certbotRenew(dryRun = false) {
  if (useHelper()) {
    return helperRequest('/certbot/renew', { dryRun })
  }
  const args = ['renew']
  if (dryRun) args.push('--dry-run')
  return runCommand(ALLOWED_CERTBOT_BIN, args, { timeout: 120000 })
}

async function certbotCerts() {
  if (useHelper()) {
    return helperRequest('/certbot/certificates')
  }
  return runCommand(ALLOWED_CERTBOT_BIN, ['certificates'])
}

module.exports = {
  runCommand,
  testNginxConfig,
  reloadNginx,
  nginxStatus,
  nginxAction,
  writeConfigFile,
  readConfigFile,
  deleteConfigFile,
  manageSymlink,
  certbotRequest,
  certbotRenew,
  certbotCerts,
  validateDomain,
  validateFilename,
  isSafePath,
  ALLOWED_NGINX_BIN,
  ALLOWED_CERTBOT_BIN,
  useHelper,
}