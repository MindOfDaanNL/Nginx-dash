const bcrypt = require('bcrypt')
const { query } = require('../src/config/database')

async function seed() {
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'Admin123!'
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'

  const existing = await query('SELECT id FROM users WHERE username = ?', [username])
  if (existing.length > 0) {
    console.log(`[seed] User ${username} already exists, skipping`)
    process.exit(0)
  }

  const hash = await bcrypt.hash(password, 12)
  await query(
    'INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())',
    [username, email, hash, 'admin']
  )

  console.log(`[seed] Created admin user: ${username}`)
  console.log(`[seed] Password: ${password}`)
  console.log('[seed] ⚠️  Change this password immediately after first login')
  process.exit(0)
}

seed().catch((err) => {
  console.error('[seed] Error:', err.message)
  process.exit(1)
})
