const csrfTokens = new Map()

function generateToken() {
  return require('crypto').randomBytes(32).toString('hex')
}

function csrfMiddleware(req, res, next) {
  console.log('DEBUG csrf', req.method, req.url, 'hasToken=', !!req.headers['x-csrf-token'], 'sessionTok=', !!req.session?.csrfToken)
  const stateChanging = ['post', 'put', 'patch', 'delete'].includes(req.method.toLowerCase())
  if (!stateChanging) {
    return next()
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf
  const sessionToken = req.session.csrfToken

  if (!sessionToken || !token || token !== sessionToken) {
    return res.status(403).json({ error: 'CSRF token mismatch' })
  }

  next()
}

function issueCsrfToken(req, res, next) {
  console.log('DEBUG issueCsrf', req.method, req.url, 'session=', !!req.session, 'sessionTok=', !!req.session?.csrfToken)
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken()
  }
  res.locals.csrfToken = req.session.csrfToken
  res.setHeader('X-CSRF-Token', req.session.csrfToken)
  next()
}

module.exports = {
  csrfMiddleware,
  issueCsrfToken,
  csrfTokens,
}
