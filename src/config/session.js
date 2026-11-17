const session = require('express-session')
const config = require('./environment')

const sessionConfig = {
  secret: config.sessionSecret,
  name: 'ndash_sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: config.sessionTimeoutMinutes * 60 * 1000,
  },
  rolling: true,
}

module.exports = session(sessionConfig)
