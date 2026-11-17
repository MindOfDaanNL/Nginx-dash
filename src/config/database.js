const mysql = require('mysql2/promise')
const config = require('./environment')

let pool = null

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      typeCast: (field, next) => {
        if (field.type === 'BIT') {
          const buffer = field.buffer()
          return buffer.length > 0 ? buffer[0] === 1 : null
        }
        return next()
      },
    })
  }
  return pool
}

function query(sql, params = []) {
  return getPool().query(sql, params).then(([rows]) => rows)
}

function execute(sql, params = []) {
  return getPool().query(sql, params)
}

function end() {
  if (pool) {
    return pool.end().then(() => { pool = null })
  }
  return Promise.resolve()
}

module.exports = {
  getPool,
  query,
  execute,
  end,
}
