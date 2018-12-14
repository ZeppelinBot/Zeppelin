require('dotenv').config();

const moment = require('moment-timezone');
moment.tz.setDefault('UTC');

module.exports = {
  type: "mysql",
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  charset: 'utf8mb4',
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: true,
  synchronize: false,

  // Entities
  entities: [`${__dirname}/src/data/entities/*.ts`],

  // Pool options
  extra: {
    typeCast(field, next) {
      if (field.type === 'DATETIME') {
        const val = field.string();
        return val != null ? moment(val).format('YYYY-MM-DD HH:mm:ss') : null;
      }

      return next();
    }
  },

  // Migrations
  migrations: ["src/migrations/*.ts"],
  cli: {
    migrationsDir: "src/migrations"
  },
};
