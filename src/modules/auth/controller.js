const bcrypt = require('bcrypt')
const { query, execute } = require('../../config/database')
const { logActivity } = require('../../services/activityService')

const SALT_ROUNDS = 12

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

async function login(req, res) {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  const rows = await query('SELECT * FROM users WHERE username = ?', [username])
  const user = rows[0]
  if (!user) {
    await logActivity({
      userId: null,
      username,
      action: 'login_failed',
      description: `Failed login attempt for unknown user ${username}`,
      ipAddress: req.ip,
      status: 'failure',
      errorInfo: 'user not found',
    })
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  if (!user.is_active) {
    await logActivity({
      userId: user.id,
      username: user.username,
      action: 'login_failed',
      description: `Login attempt on disabled account ${username}`,
      ipAddress: req.ip,
      status: 'failure',
      errorInfo: 'account disabled',
    })
    return res.status(401).json({ error: 'Account is disabled' })
  }

  const match = await comparePassword(password, user.password_hash)
  if (!match) {
    await logActivity({
      userId: user.id,
      username: user.username,
      action: 'login_failed',
      description: `Failed login attempt (wrong password) for ${username}`,
      ipAddress: req.ip,
      status: 'failure',
      errorInfo: 'wrong password',
    })
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.is_active,
  }
  console.log('DEBUG login set user, session.id=', req.session.id)
  await new Promise((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())))

  await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id])
  await logActivity({
    userId: user.id,
    username: user.username,
    action: 'login',
    description: `User ${username} logged in`,
    ipAddress: req.ip,
    status: 'success',
  })

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  })
}

async function logout(req, res) {
  const user = req.session.user
  if (user) {
    await logActivity({
      userId: user.id,
      username: user.username,
      action: 'logout',
      description: `User ${user.username} logged out`,
      ipAddress: req.ip,
      status: 'success',
    })
  }
  req.session.destroy(() => {
    res.clearCookie('ndash_sid')
    return res.json({ message: 'Logged out' })
  })
}

async function me(req, res) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  return res.json({
    user: {
      id: req.session.user.id,
      username: req.session.user.username,
      email: req.session.user.email,
      role: req.session.user.role,
      isActive: req.session.user.isActive,
    },
  })
}

async function createUser(req, res) {
  const { username, email, password, role } = req.body || {}
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password and role are required' })
  }
  if (!['admin', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  const existing = await query('SELECT id FROM users WHERE username = ?', [username])
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Username already exists' })
  }

  const passwordHash = await hashPassword(password)
  const [result] = await execute(
    'INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())',
    [username, email || null, passwordHash, role]
  )

  const actor = req.session.user
  await logActivity({
    userId: actor ? actor.id : null,
    username: actor ? actor.username : 'system',
    action: 'user_created',
    description: `User ${username} created with role ${role}`,
    ipAddress: req.ip,
    status: 'success',
  })

  return res.status(201).json({
    user: { id: result.insertId, username, email, role, isActive: true },
  })
}

async function listUsers(req, res) {
  const rows = await query(
    'SELECT id, username, email, role, is_active, last_login, created_at, updated_at FROM users ORDER BY created_at DESC'
  )
  return res.json({ users: rows })
}

async function updateUser(req, res) {
  const { id } = req.params
  const { email, role, is_active, username } = req.body || {}

  const actor = req.session.user
  const target = (await query('SELECT * FROM users WHERE id = ?', [id]))[0]
  if (!target) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (parseInt(id, 10) === actor.id && role && role !== 'admin') {
    return res.status(400).json({ error: 'Cannot change your own admin role' })
  }

  const updates = []
  const params = []
  if (username !== undefined) { updates.push('username = ?'); params.push(username) }
  if (email !== undefined) { updates.push('email = ?'); params.push(email) }
  if (role !== undefined) { updates.push('role = ?'); params.push(role) }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0) }
  updates.push('updated_at = NOW()')
  params.push(id)

  if (updates.length > 1) {
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)
  }

  await logActivity({
    userId: actor.id,
    username: actor.username,
    action: 'user_updated',
    description: `User ${target.username} updated`,
    ipAddress: req.ip,
    status: 'success',
  })

  const updated = (await query('SELECT id, username, email, role, is_active, last_login, created_at, updated_at FROM users WHERE id = ?', [id]))[0]
  return res.json({ user: updated })
}

async function deleteUser(req, res) {
  const { id } = req.params
  const actor = req.session.user

  if (parseInt(id, 10) === actor.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' })
  }

  const target = (await query('SELECT * FROM users WHERE id = ?', [id]))[0]
  if (!target) {
    return res.status(404).json({ error: 'User not found' })
  }

  const adminCount = await query('SELECT COUNT(*) AS c FROM users WHERE role = ? AND is_active = 1', ['admin'])
  if (target.role === 'admin' && parseInt(adminCount[0].c, 10) <= 1) {
    return res.status(400).json({ error: 'Cannot delete the last active administrator' })
  }

  await query('DELETE FROM users WHERE id = ?', [id])
  await logActivity({
    userId: actor.id,
    username: actor.username,
    action: 'user_deleted',
    description: `User ${target.username} deleted`,
    ipAddress: req.ip,
    status: 'success',
  })

  return res.json({ message: 'User deleted' })
}

async function resetPassword(req, res) {
  const { id } = req.params
  const { password } = req.body || {}
  if (!password) {
    return res.status(400).json({ error: 'Password is required' })
  }

  const actor = req.session.user
  const target = (await query('SELECT * FROM users WHERE id = ?', [id]))[0]
  if (!target) {
    return res.status(404).json({ error: 'User not found' })
  }

  const passwordHash = await hashPassword(password)
  await query('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [passwordHash, id])

  await logActivity({
    userId: actor.id,
    username: actor.username,
    action: 'password_reset',
    description: `Password reset for user ${target.username}`,
    ipAddress: req.ip,
    status: 'success',
  })

  return res.json({ message: 'Password reset' })
}

module.exports = {
  hashPassword,
  comparePassword,
  login,
  logout,
  me,
  createUser,
  listUsers,
  updateUser,
  deleteUser,
  resetPassword,
}
