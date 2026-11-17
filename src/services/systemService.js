const nginxService = require('./nginxService')

async function getStatus() {
  const result = await nginxService.nginxStatus()
  let running = false
  let version = null

  const output = (result.stdout || '') + (result.stderr || '')
  const runningMatch = output.match(/Active:\s*(\w+)/i)
  if (runningMatch) {
    running = runningMatch[1].toLowerCase() === 'active'
  }
  const versionMatch = output.match(/nginx\/([\d.]+)/)
  if (versionMatch) {
    version = versionMatch[1]
  } else {
    const verResult = await nginxService.runCommand(nginxService.ALLOWED_NGINX_BIN, ['-v'])
    const verMatch = (verResult.stderr || verResult.stdout || '').match(/nginx\/([\d.]+)/)
    if (verMatch) version = verMatch[1]
  }

  return {
    running,
    version,
    code: result.code,
    stdout: result.stdout,
    stderr: result.stderr,
  }
}

async function start() {
  return nginxService.nginxAction('start')
}

async function stop() {
  return nginxService.nginxAction('stop')
}

async function restart() {
  return nginxService.nginxAction('restart')
}

async function reload() {
  return nginxService.reloadNginx()
}

async function test() {
  return nginxService.testNginxConfig()
}

module.exports = {
  getStatus,
  start,
  stop,
  restart,
  reload,
  test,
}
