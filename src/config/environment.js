require('dotenv').config()

const required = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'SESSION_SECRET',
]

const missing = required.filter((key) => !process.env[key])
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
}

const parseBool = (val) => val === 'true' || val === '1'

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  appName: process.env.APP_NAME || 'Nginx-Dash',
  sessionSecret: process.env.SESSION_SECRET,
  sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '120', 10),

  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },

  nginx: {
    bin: process.env.NGINX_BIN || '/usr/sbin/nginx',
    sitesAvailable: process.env.NGINX_SITES_AVAILABLE || '/etc/nginx/sites-available',
    sitesEnabled: process.env.NGINX_SITES_ENABLED || '/etc/nginx/sites-enabled',
  },

  certbot: {
    bin: process.env.CERTBOT_BIN || '/usr/bin/certbot',
    defaultEmail: process.env.DEFAULT_LE_EMAIL || 'admin@example.com',
  },

  helper: {
    port: parseInt(process.env.NGINX_HELPER_PORT || '4011', 10),
    token: process.env.NGINX_HELPER_TOKEN || 'change-me-helper-token',
    url: process.env.NGINX_HELPER_URL || `http://127.0.0.1:${parseInt(process.env.NGINX_HELPER_PORT || '4011', 10)}`,
  },

  isProduction: parseBool(process.env.NODE_ENV === 'production'),
  isDevelopment: parseBool(process.env.NODE_ENV !== 'production'),
}
