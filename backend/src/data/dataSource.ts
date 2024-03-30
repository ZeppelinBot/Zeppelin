import moment from "moment-timezone";
import path from "path";
import { DataSource } from "typeorm";
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions.js";
import { env } from "../env";
import { backendDir } from "../paths";

moment.tz.setDefault("UTC");

const entities = path.relative(process.cwd(), path.resolve(backendDir, "dist/data/entities/*.js"));
const migrations = path.relative(process.cwd(), path.resolve(backendDir, "dist/migrations/*.js"));

type DbOpts = Pick<MysqlConnectionOptions, "host" | "port" | "username" | "password" | "database">;
let dbOpts: DbOpts;
if (env.HOST_MODE === "development") {
  dbOpts = {
    host: "mysql",
    port: 3306,
    username: "zeppelin",
    password: env.DEVELOPMENT_MYSQL_PASSWORD,
    database: "zeppelin",
  };
} else if (env.HOST_MODE === "standalone") {
  dbOpts = {
    host: "mysql",
    port: 3306,
    username: "zeppelin",
    password: env.STANDALONE_MYSQL_PASSWORD,
    database: "zeppelin",
  };
} else if (env.HOST_MODE === "lightweight") {
  dbOpts = {
    host: env.LIGHTWEIGHT_DB_HOST,
    port: env.LIGHTWEIGHT_DB_PORT,
    username: env.LIGHTWEIGHT_DB_USER,
    password: env.LIGHTWEIGHT_DB_PASSWORD,
    database: env.LIGHTWEIGHT_DB_DATABASE,
  };
} else {
  throw new Error(`Unknown host mode: ${env.HOST_MODE}`);
}

export const dataSource = new DataSource({
  type: "mysql",
  ...dbOpts,
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
