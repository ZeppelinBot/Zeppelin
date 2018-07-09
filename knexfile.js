require('dotenv').config();

module.exports = {
  client: 'mariasql',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    db: process.env.DB_DATABASE,
    charset: 'utf8mb4'
  },
  pool: {
    afterCreate(connection, callback) {
      connection.query("SET time_zone = '+0:00';", err => {
        callback(err, connection);
      });
    }
  }
};
