const fs = require("fs");
const path = require("path");
const pkgUp = require("pkg-up");

const closestPackageJson = pkgUp.sync();
if (!closestPackageJson) {
  throw new Error("Could not find project root from ormconfig.js");
}
const backendRoot = path.dirname(closestPackageJson);

try {
  fs.accessSync(path.resolve(backendRoot, "bot.env"));
  require("dotenv").config({ path: path.resolve(backendRoot, "bot.env") });
} catch {
  try {
    fs.accessSync(path.resolve(backendRoot, "api.env"));
    require("dotenv").config({ path: path.resolve(backendRoot, "api.env") });
  } catch {
    throw new Error("bot.env or api.env required");
  }
}

const moment = require("moment-timezone");
moment.tz.setDefault("UTC");

const entities = path.relative(process.cwd(), path.resolve(backendRoot, "dist/backend/src/data/entities/*.js"));
const migrations = path.relative(process.cwd(), path.resolve(backendRoot, "dist/backend/src/migrations/*.js"));
const migrationsDir = path.relative(process.cwd(), path.resolve(backendRoot, "src/migrations"));

module.exports = {
  type: "mysql",
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
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
