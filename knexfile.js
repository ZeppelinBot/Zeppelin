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
    typeCast(field, next) {
      if (field.type === 'DATETIME') {
        return moment(field.string()).format('YYYY-MM-DD HH:mm:ss');
      }

      return next();
    }
  }
};
