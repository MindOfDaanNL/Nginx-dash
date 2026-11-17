const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../../middleware/authentication');
const { issueCsrfToken, csrfMiddleware } = require('../../middleware/csrf');
const { asyncHandler } = require('../../utils/asyncHandler');
const { query } = require('../../config/database');

router.get('/api/users', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (page - 1) * limit;
  let where = '';
  let params = [];
  if (search) {
    where = 'WHERE username LIKE ? OR email LIKE ?';
    params = [`%${search}%`, `%${search}%`];
  }
  const [rows] = await query(
    `SELECT id, username, email, role, is_active, created_at, last_login FROM users ${where} ORDER BY username LIMIT ? OFFSET ?`,
    [...params, parseInt(limit, 10), parseInt(offset, 10)]
  );
  const [countRows] = await query(`SELECT COUNT(*) as count FROM users`, []);
  const total = countRows.length > 0 ? countRows[0].count : 0;
  return res.json({ users: rows, total });
}));

router.get('/api/users/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await query('SELECT id, username, email, role, is_active, created_at, last_login FROM users WHERE id = ?', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ user: rows[0] });
}));

router.post('/api/users', requireAuth, requireAdmin, issueCsrfToken, csrfMiddleware, asyncHandler(async (req, res) => {
  const { username, email, role, password } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  const [check] = await query('SELECT id FROM users WHERE username = ?', [username]);
  if (check.length > 0) {
    return res.status(409).json({ error: 'Username already exists' });
  }
  const bcrypt = require('bcryptjs');
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;
  await query(
    'INSERT INTO users (username, email, role, password_hash, is_active) VALUES (?, ?, ?, ?, ?)',
    [username, email || null, role || 'viewer', passwordHash, true]
  );
  return res.status(201).json({ message: 'Gebruiker aangemaakt' });
}));

router.put('/api/users/:id', requireAuth, requireAdmin, issueCsrfToken, csrfMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { username, email, role, password, is_active } = req.body || {};
  const fields = [];
  const params = [];
  if (username !== undefined) { fields.push('username = ?'); params.push(username); }
  if (email !== undefined) { fields.push('email = ?'); params.push(email); }
  if (role !== undefined) { fields.push('role = ?'); params.push(role); }
  if (password) { fields.push('password_hash = ?'); params.push(await bcrypt.hash(password, 10)); }
  if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active); }
  if (fields.length === 0) {
    return res.status(400).json({ error: 'Geen velden om bij te werken' });
  }
  params.push(id);
  await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
  return res.json({ message: 'Gebruiker bijgewerkt' });
}));

router.delete('/api/users/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [user] = await query('SELECT role FROM users WHERE id = ?', [id]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.role === 'admin') {
    const [admins] = await query('SELECT COUNT(*) as cnt FROM users WHERE role = ?', ['admin']);
    if (admins[0].cnt <= 1) {
      return res.status(400).json({ error: 'Kan de laatste admin-gebruiker niet verwijderen' });
    }
  }
  await query('DELETE FROM users WHERE id = ?', [id]);
  return res.json({ message: 'Gebruiker verwijderd' });
}));

router.post('/api/users/:id/reset-password', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'Wachtwoord is vereist' });
  }
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(password, 10);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  return res.json({ message: 'Wachtwoord gereset' });
}));

module.exports = router;