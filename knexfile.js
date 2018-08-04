require('dotenv').config();

const moment = require('moment-timezone');
moment.tz.setDefault('UTC');

module.exports = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    charset: 'utf8mb4',
    timezone: 'UTC',
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: true,
    typeCast(field, next) {
      if (field.type === 'DATETIME') {
        const val = field.string();
        return val != null ? moment(val).format('YYYY-MM-DD HH:mm:ss') : null;
      }

      return next();
    }
  },
  pool: {
    afterCreate(conn, cb) {
      conn.query('SET time_zone = "+00:00";', err => {
        cb(err, conn);
      });
    }
  }
};
