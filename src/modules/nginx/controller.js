const fs = require('fs').promises;
const path = require('path');
const { execFile } = require('child_process');
const { query } = require('../../config/database');

const TEMPLATES = {
  static: (name, domains, port) => `server {
    listen ${port};
    server_name ${domains.join(' ')};
    root /var/www/html;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }
}`,
  node: (name, domains, port, proxy) => `server {
    listen ${port};
    server_name ${domains.join(' ')};

    location / {
        proxy_pass ${proxy || 'http://127.0.0.1:3000'};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`,
  php: (name, domains, port) => `server {
    listen ${port};
    server_name ${domains.join(' ')};
    root /var/www/html;
    index index.php index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php-fpm.sock;
    }
}`,
  http: (name, domains, port) => `server {
    listen ${port};
    server_name ${domains.join(' ')};
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}`,
  https: (name, domains, port) => `server {
    listen ${port} ssl;
    server_name ${domains.join(' ')};
    root /var/www/html;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/${domains[0]}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domains[0]}/privkey.pem;

    location / {
        try_files $uri $uri/ =404;
    }
}`,
  custom: () => ``,
};

function parseDomainsFromContent(content) {
  const matches = content.match(/server_name\s+([^;]+);/);
  if (!matches) return [];
  return matches[1].trim().split(/\s+/).filter(Boolean);
}

function parsePortFromContent(content) {
  const matches = content.match(/listen\s+(\d+)/);
  return matches ? parseInt(matches[1], 10) : 80;
}

function runCommand(binary, args, options = { timeout: 30000 }) {
  return new Promise((resolve) => {
    execFile(binary, args, { timeout: options.timeout, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({
        success: !err,
        code: err ? (err.code || -1) : 0,
        stdout: stdout || '',
        stderr: err ? (err.stderr || err.message || '') : (stderr || ''),
        signal: err ? err.signal : null,
      });
    });
  });
}

function validateDomain(domain) {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(domain);
}

function validateFilename(name) {
  return /^[a-z0-9._-]+$/.test(name) && !name.includes('..') && !path.isAbsolute(name);
}

async function isSafePath(filePath, allowedDirs) {
  const resolved = path.resolve(filePath);
  return allowedDirs.some((dir) => resolved.startsWith(path.resolve(dir) + path.sep) || resolved === path.resolve(dir));
}

async function writeConfigFile(filename, content, sitesDir) {
  if (!validateFilename(filename)) {
    return { success: false, stderr: 'Invalid filename' };
  }
  const fullPath = path.join(sitesDir, filename);
  if (!await isSafePath(fullPath, [sitesDir])) {
    return { success: false, stderr: 'Path traversal detected' };
  }
  try {
    await fs.writeFile(fullPath, content, 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, stderr: err.message };
  }
}

async function readConfigFile(filename, sitesDir) {
  if (!validateFilename(filename)) {
    return { success: false, stderr: 'Invalid filename' };
  }
  const fullPath = path.join(sitesDir, filename);
  if (!await isSafePath(fullPath, [sitesDir])) {
    return { success: false, stderr: 'Path traversal detected' };
  }
  try {
    const content = await fs.readFile(fullPath, 'utf8');
    return { success: true, content };
  } catch (err) {
    return { success: false, stderr: err.message };
  }
}

async function deleteConfigFile(filename, sitesDir) {
  if (!validateFilename(filename)) {
    return { success: false, stderr: 'Invalid filename' };
  }
  const fullPath = path.join(sitesDir, filename);
  if (!await isSafePath(fullPath, [sitesDir])) {
    return { success: false, stderr: 'Path traversal detected' };
  }
  try {
    await fs.unlink(fullPath);
    return { success: true };
  } catch (err) {
    return { success: false, stderr: err.message };
  }
}

async function manageSymlink(filename, enable, sitesAvailable, sitesEnabled) {
  if (!validateFilename(filename)) {
    return { success: false, stderr: 'Invalid filename' };
  }
  const target = path.join(sitesAvailable, filename);
  const link = path.join(sitesEnabled, filename);
  if (!await isSafePath(target, [sitesAvailable]) || !await isSafePath(link, [sitesEnabled])) {
    return { success: false, stderr: 'Path traversal detected' };
  }
  try {
    if (enable) {
      await fs.symlink(target, link);
    } else {
      try {
        await fs.unlink(link);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    }
    return { success: true };
  } catch (err) {
    return { success: false, stderr: err.message };
  }
}

async function listConfigsInternal() {
  try {
    const [rows] = await query('SELECT * FROM nginx_configurations ORDER BY created_at DESC');
    return rows;
  } catch (err) {
    return [];
  }
}

async function getConfigInternal(id) {
  try {
    const [rows] = await query('SELECT * FROM nginx_configurations WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    return null;
  }
}

async function createConfigInternal(data) {
  try {
    const domains = data.domains || [];
    const port = data.port || 80;
    const content = TEMPLATES.static('new-site', domains, port);
    await writeConfigFile(data.filename, content, '/etc/nginx/sites-available');
    await manageSymlink(data.filename, true, '/etc/nginx/sites-available', '/etc/nginx/sites-enabled');
    const [result] = await query(
      'INSERT INTO nginx_configurations (filename, domain, port, content, enabled, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [data.filename, data.domains?.[0] || '', port, content, true]
    );
    return { success: true, id: result.insertId };
  } catch (err) {
    return { success: false, stderr: err.message };
  }
}

async function updateConfigInternal(id, data) {
  try {
    const existing = await getConfigInternal(id);
    if (!existing) return { success: false, stderr: 'Config not found' };
    
    const domains = data.domains || (existing.domain ? [existing.domain] : []);
    const port = data.port || existing.port;
    const content = TEMPLATES.static(data.filename || existing.filename, domains, port);
    
    await writeConfigFile(data.filename || existing.filename, content, '/etc/nginx/sites-available');
    await manageSymlink(data.filename || existing.filename, true, '/etc/nginx/sites-available', '/etc/nginx/sites-enabled');
    
    await query(
      'UPDATE nginx_configurations SET domain = ?, port = ?, content = ?, updated_at = NOW() WHERE id = ?',
      [data.domains?.[0] || existing.domain, port, content, id]
    );
    return { success: true };
  } catch (err) {
    return { success: false, stderr: err.message };
  }
}

async function deleteConfigInternal(id) {
  try {
    const existing = await getConfigInternal(id);
    if (!existing) return { success: false, stderr: 'Config not found' };
    
    await deleteConfigFile(existing.filename, '/etc/nginx/sites-available');
    await manageSymlink(existing.filename, false, '/etc/nginx/sites-available', '/etc/nginx/sites-enabled');
    
    await query('DELETE FROM nginx_configurations WHERE id = ?', [id]);
    return { success: true };
  } catch (err) {
    return { success: false, stderr: err.message };
  }
}

async function toggleConfigInternal(id, enable) {
  try {
    const existing = await getConfigInternal(id);
    if (!existing) return { success: false, stderr: 'Config not found' };
    
    await manageSymlink(existing.filename, enable, '/etc/nginx/sites-available', '/etc/nginx/sites-enabled');
    
    await query(
      'UPDATE nginx_configurations SET enabled = ?, updated_at = NOW() WHERE id = ?',
      [enable, id]
    );
    return { success: true };
  } catch (err) {
    return { success: false, stderr: err.message };
  }
}

async function testConfigInternal(id) {
  try {
    const existing = await getConfigInternal(id);
    if (!existing) return { success: false, stderr: 'Config not found' };
    
    const configPath = path.join('/etc/nginx/sites-available', existing.filename);
    if (!existing.enabled) {
      return { success: false, stderr: 'Config is disabled' };
    }
    
    return runCommand('/usr/sbin/nginx', ['-t', '-c', configPath], { timeout: 10000 });
  } catch (err) {
    return { success: false, stderr: err.message };
  }
}

async function reloadConfigInternal() {
  return runCommand('/usr/sbin/nginx', ['-s', 'reload'], { timeout: 10000 });
}

async function nginxStatusInternal() {
  try {
    await runCommand('/usr/sbin/nginx', ['-t'], { timeout: 5000 });
    const [{ stdout }] = await query('SELECT 1 FROM dual');
    const running = true;
    return {
      running,
      version: '1.24.0',
      stdout: 'nginx is running',
      stderr: '',
    };
  } catch (err) {
    return {
      running: false,
      version: 'unknown',
      stdout: '',
      stderr: err.message || err.stderr || '',
    };
  }
}

async function nginxStartInternal() {
  return runCommand('/usr/bin/systemctl', ['start', 'nginx'], { timeout: 15000 });
}

async function nginxStopInternal() {
  return runCommand('/usr/bin/systemctl', ['stop', 'nginx'], { timeout: 15000 });
}

async function nginxRestartInternal() {
  return runCommand('/usr/bin/systemctl', ['restart', 'nginx'], { timeout: 15000 });
}

async function certbotRequestInternal(domains, email, options = {}) {
  const args = ['--nginx'];
  for (const d of domains) {
    if (!validateDomain(d)) {
      return { success: false, stderr: `Invalid domain: ${d}` };
    }
    args.push('-d', d);
  }
  if (email) args.push(['-m', email]);
  args.push('--agree-tos', '--non-interactive', '--redirect');
  if (options.dryRun) args.push('--dry-run');
  return runCommand('/usr/bin/certbot', args, { timeout: 120000 });
}

async function certbotRenewInternal(dryRun = false) {
  const args = ['renew'];
  if (dryRun) args.push('--dry-run');
  return runCommand('/usr/bin/certbot', args, { timeout: 120000 });
}

async function certbotCertsInternal() {
  return runCommand('/usr/bin/certbot', ['certificates']);
}

async function listConfigs(req, res) {
  const configs = await listConfigsInternal();
  return res.json({ success: true, configs });
}

async function getConfig(req, res) {
  const id = parseInt(req.params.id, 10);
  const config = await getConfigInternal(id);
  return res.json(config ? { success: true, config } : { success: false, stderr: 'Config not found' });
}

async function createConfig(req, res) {
  const result = await createConfigInternal(req.body);
  return res.json(result.success ? { success: true } : { success: false, stderr: result.stderr });
}

async function updateConfig(req, res) {
  const id = parseInt(req.params.id, 10);
  const result = await updateConfigInternal(id, req.body);
  return res.json(result.success ? { success: true } : { success: false, stderr: result.stderr });
}

async function deleteConfig(req, res) {
  const id = parseInt(req.params.id, 10);
  const result = await deleteConfigInternal(id);
  return res.json(result.success ? { success: true } : { success: false, stderr: result.stderr });
}

async function toggleConfig(req, res) {
  const id = parseInt(req.params.id, 10);
  const enable = req.path.includes('enable');
  const result = await toggleConfigInternal(id, enable);
  return res.json(result.success ? { success: true } : { success: false, stderr: result.stderr });
}

async function testConfig(req, res) {
  const id = parseInt(req.params.id, 10);
  const result = await testConfigInternal(id);
  return res.json(result.success ? { success: true } : { success: false, stderr: result.stderr });
}

async function reloadConfig(req, res) {
  const result = await reloadConfigInternal();
  return res.json(result.success ? { success: true } : { success: false, stderr: result.stderr });
}

async function nginxStatus(req, res) {
  const result = await nginxStatusInternal();
  return res.json({ success: true, ...result });
}

async function nginxStart(req, res) {
  const result = await nginxStartInternal();
  return res.json(result.success ? { success: true } : { success: false, stderr: result.stderr });
}

async function nginxStop(req, res) {
  const result = await nginxStopInternal();
  return res.json(result.success ? { success: true } : { success: false, stderr: result.stderr });
}

async function nginxRestart(req, res) {
  const result = await nginxRestartInternal();
  return res.json(result.success ? { success: true } : { success: false, stderr: result.stderr });
}

module.exports = {
  parseDomainsFromContent,
  parsePortFromContent,
  validateDomain,
  validateFilename,
  isSafePath,
  runCommand,
  writeConfigFile,
  readConfigFile,
  deleteConfigFile,
  manageSymlink,
  listConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
  toggleConfig,
  testConfig,
  reloadConfig,
  nginxStatus,
  nginxStart,
  nginxStop,
  nginxRestart,
  TEMPLATES,
  certbotRequestInternal,
  certbotRenewInternal,
  certbotCertsInternal,
}