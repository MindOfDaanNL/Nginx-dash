const express = require('express')
const helmet = require('helmet')
const session = require('./config/session')
const flash = require('connect-flash')
const path = require('path')
const config = require('./config/environment')

const authRoutes = require('./modules/auth/routes')
const dashboardRoutes = require('./modules/dashboard/routes')
const nginxRoutes = require('./modules/nginx/routes')
const sslRoutes = require('./modules/ssl/routes')
const settingsRoutes = require('./modules/settings/routes')
const usersRoutes = require('./modules/users/routes')
const systemRoutes = require('./modules/system/routes')
const activityRoutes = require('./modules/activity/routes')
const { notFound, errorHandler } = require('./middleware/errorHandler')
const { issueCsrfToken } = require('./middleware/csrf')

const app = express()

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.locals.nginxSitesAvailable = config.nginx.sitesAvailable
app.locals.nginxSitesEnabled = config.nginx.sitesEnabled
app.locals.defaultLeEmail = config.certbot.defaultEmail
app.locals.appName = config.appName
app.locals.appUrl = config.appUrl

app.use(helmet())
app.use(express.json())
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path.startsWith('/api/nginx')) {
    console.log('DEBUG body', req.path, JSON.stringify(req.body || {}), 'ctype=', req.headers['content-type'])
  }
  next()
})
app.use(session)
app.use(flash())
app.use(issueCsrfToken)
app.use(express.static(path.join(__dirname, '..', 'public')))

app.use((req, res, next) => {
  res.locals.flash = req.flash()
  res.locals.config = config
  next()
})

// API routes
app.use(usersRoutes)
app.use(authRoutes)
app.use(dashboardRoutes)
app.use(nginxRoutes)
app.use(sslRoutes)
app.use(systemRoutes)
app.use(settingsRoutes)
app.use(activityRoutes)

// HTML page routes
app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login')
  res.render('layouts/main', { title: 'Dashboard', activePage: 'dashboard', content: 'pages/dashboard-body' })
})
app.get('/nginx', (req, res) => {
  if (!req.session.user) return res.redirect('/login')
  res.render('layouts/main', { title: 'Nginx-configuraties', activePage: 'nginx', content: 'pages/nginx-body' })
})
app.get('/nginx/:id', (req, res) => {
  if (!req.session.user) return res.redirect('/login')
  res.render('layouts/main', { title: 'Configuratie', activePage: 'nginx', content: 'pages/nginx-detail-body', configId: req.params.id })
})
app.get('/ssl', (req, res) => {
  if (!req.session.user) return res.redirect('/login')
  res.render('layouts/main', { title: 'SSL-certificaten', activePage: 'ssl', content: 'pages/ssl-body' })
})
app.get('/logs', (req, res) => {
  if (!req.session.user) return res.redirect('/login')
  if (req.session.user.role !== 'admin') return res.redirect('/')
  res.render('layouts/main', { title: 'Activiteitenlog', activePage: 'logs', content: 'pages/logs-body' })
})
app.get('/users', (req, res) => {
  if (!req.session.user) return res.redirect('/login')
  if (req.session.user.role !== 'admin') return res.redirect('/')
  res.render('layouts/main', { title: 'Gebruikersbeheer', activePage: 'users', content: 'pages/users-body' })
})
app.get('/settings', (req, res) => {
  if (!req.session.user) return res.redirect('/login')
  if (req.session.user.role !== 'admin') return res.redirect('/')
  res.render('layouts/main', { title: 'Instellingen', activePage: 'settings', content: 'pages/settings-body' })
})
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/')
  res.render('auth/login', { title: 'Login' })
})

app.use(notFound)
app.use(errorHandler)

module.exports = app
