const nginxService = require('./nginxService')

async function listCertificates() {
  const result = await nginxService.certbotCerts()
  return result
}

async function requestCertificate(domains, email) {
  return nginxService.certbotRequest(domains, email)
}

async function renewCertificate(dryRun = false) {
  return nginxService.certbotRenew(dryRun)
}

module.exports = {
  listCertificates,
  requestCertificate,
  renewCertificate,
}
