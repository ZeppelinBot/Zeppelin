require('dotenv').config();

module.exports = {
  client: 'mariasql',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    db: process.env.DB_DATABASE,
    timezone: 'UTC',
    charset: 'utf8mb4'
  }
};
