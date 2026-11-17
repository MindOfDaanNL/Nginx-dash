const fs = require('fs').promises
const path = require('path')
const { query, getPool, end } = require('../src/config/database')

const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'database', 'migrations')

async function getApplied() {
  try {
    const rows = await query('SELECT name FROM migrations')
    return new Set(rows.map((r) => r.name))
  } catch (err) {
    return new Set()
  }
}

async function runMigrations() {
  await query(`CREATE TABLE IF NOT EXISTS migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)

  const applied = await getApplied()
  const files = (await fs.readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
    const statements = sql.split(';').map((s) => s.trim()).filter(Boolean)
    for (const stmt of statements) {
      await query(stmt)
    }
    await query('INSERT INTO migrations (name, applied_at) VALUES (?, NOW())', [file])
    console.log(`[migrate] Applied ${file}`)
  }

  console.log('[migrate] All migrations applied')
  await end()
}

runMigrations().catch((err) => {
  console.error('[migrate] Error:', err.message)
  process.exit(1)
})
