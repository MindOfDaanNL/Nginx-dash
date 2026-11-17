function errorHandler(err, req, res, next) {
  console.error(err)

  const status = err.status || 500
  const message = err.message || 'Internal Server Error'

  if (req.accepts('json') || req.path.startsWith('/api/')) {
    return res.status(status).json({ error: message })
  }

  res.status(status).render('error', {
    status,
    message,
  })
}

function notFound(req, res) {
  if (req.accepts('json') || req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not Found' })
  }
  res.status(404).render('error', { status: 404, message: 'Not Found' })
}

module.exports = {
  errorHandler,
  notFound,
}
