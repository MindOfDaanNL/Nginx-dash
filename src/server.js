const app = require('./app')
const config = require('./config/environment')
const { query } = require('./config/database')

async function start() {
  try {
    await query('SELECT 1')
    console.log('[nginx-dash] Database connection OK')
  } catch (err) {
    console.error('[nginx-dash] Database connection failed:', err.message)
    process.exit(1)
  }

  app.listen(config.port, () => {
    console.log(`[nginx-dash] Server running on http://localhost:${config.port} (${config.nodeEnv})`)
  })
}

start()
