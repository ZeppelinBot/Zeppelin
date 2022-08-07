const fs = require("fs");
const path = require("path");
const pkgUp = require("pkg-up");
const { backendDir } = require("./dist/backend/src/paths");
const { env } = require("./dist/backend/src/env");

const moment = require("moment-timezone");
moment.tz.setDefault("UTC");

const entities = path.relative(process.cwd(), path.resolve(backendDir, "dist/backend/src/data/entities/*.js"));
const migrations = path.relative(process.cwd(), path.resolve(backendDir, "dist/backend/src/migrations/*.js"));
const migrationsDir = path.relative(process.cwd(), path.resolve(backendDir, "src/migrations"));

module.exports = {
  type: "mysql",
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  charset: "utf8mb4",
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: true,
  synchronize: false,
  connectTimeout: 2000,

  logging: ["error", "warn"],

  // Entities
  entities: [entities],

  // Pool options
  extra: {
    typeCast(field, next) {
      if (field.type === "DATETIME") {
        const val = field.string();
        return val != null ? moment.utc(val).format("YYYY-MM-DD HH:mm:ss") : null;
      }

      return next();
    },
  },

  // Migrations
  migrations: [migrations],
  cli: {
    migrationsDir,
  },
};
