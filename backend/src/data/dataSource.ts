import moment from "moment-timezone";
import path from "path";
import { DataSource } from "typeorm";
import { env } from "../env";
import { backendDir } from "../paths";

moment.tz.setDefault("UTC");

const entities = path.relative(process.cwd(), path.resolve(backendDir, "dist/backend/src/data/entities/*.js"));
const migrations = path.relative(process.cwd(), path.resolve(backendDir, "dist/backend/src/migrations/*.js"));

export const dataSource = new DataSource({
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
});
