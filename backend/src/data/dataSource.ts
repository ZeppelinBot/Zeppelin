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
const dbOpts: DbOpts =
  env.NODE_ENV === "production"
    ? {
        host: env.DB_HOST,
        port: env.DB_PORT,
        username: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_DATABASE,
      }
    : {
        host: "mysql",
        port: 3306,
        username: "zeppelin",
        password: env.DEVELOPMENT_MYSQL_PASSWORD,
        database: "zeppelin",
      };

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
