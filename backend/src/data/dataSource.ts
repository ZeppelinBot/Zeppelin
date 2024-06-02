import moment from "moment-timezone";
import path from "path";
import { DataSource } from "typeorm";
import { env } from "../env.js";
import { backendDir } from "../paths.js";

moment.tz.setDefault("UTC");

const entities = path.relative(process.cwd(), path.resolve(backendDir, "dist/data/entities/*.js"));
const migrations = path.relative(process.cwd(), path.resolve(backendDir, "dist/migrations/*.js"));

export const dataSource = new DataSource({
  type: "mysql",
  host: env.DB_HOST || "mysql",
  port: env.DB_PORT || 3306,
  username: env.DB_USER || "zeppelin",
  password: env.DB_PASSWORD || env.DEVELOPMENT_MYSQL_PASSWORD,
  database: env.DB_DATABASE || "zeppelin",
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
});
