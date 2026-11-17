const bcrypt = require('bcryptjs');
const { query } = require('../../config/database');

module.exports = {
  hashPassword: async (password) => await bcrypt.hash(password, 10),
}