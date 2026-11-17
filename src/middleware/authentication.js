function requireAuth(req, res, next) {
  console.log('DEBUG requireAuth sid=', req.session?.id, 'cookie=', req.headers.cookie ? 'yes' : 'no', 'user=', req.session?.user ? req.session.user.username : 'none', 'isNew=', req.session?.isNew)
  if (!req.session || !req.session.user) {
    if (req.accepts('json') || req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return res.redirect('/login')
  }
  next()
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      if (req.accepts('json') || req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      return res.redirect('/login')
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      if (req.accepts('json') || req.path.startsWith('/api/')) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      return res.status(403).send('Forbidden')
    }

    next()
  }
}

function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next)
}

function setUserLocals(req, res, next) {
  res.locals.user = req.session.user || null
  res.locals.isAuthenticated = !!req.session.user
  res.locals.isAdmin = req.session.user && req.session.user.role === 'admin'
  next()
}

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
  setUserLocals,
}
