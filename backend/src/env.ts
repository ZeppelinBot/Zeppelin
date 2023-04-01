import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { rootDir } from "./paths";

const envType = z.object({
  KEY: z.string().length(32),

  CLIENT_ID: z.string().min(16),
  CLIENT_SECRET: z.string().length(32),
  BOT_TOKEN: z.string().min(50),

  DASHBOARD_URL: z.string().url(),
  API_URL: z.string().url(),
  API_PORT: z.preprocess((v) => Number(v), z.number().min(1).max(65535)).default(3000),

  STAFF: z
    .preprocess(
      (v) =>
        String(v)
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== ""),
      z.array(z.string()),
    )
    .optional(),

  DEFAULT_ALLOWED_SERVERS: z
    .preprocess(
      (v) =>
        String(v)
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== ""),
      z.array(z.string()),
    )
    .optional(),

  PHISHERMAN_API_KEY: z.string().optional(),

  DOCKER_DEV_MYSQL_PASSWORD: z.string().optional(), // Included here for the DB_PASSWORD default in development
  DOCKER_PROD_MYSQL_PASSWORD: z.string().optional(), // Included here for the DB_PASSWORD default in production

  DB_HOST: z.string().optional().default("mysql"),
  DB_PORT: z
    .preprocess((v) => Number(v), z.number())
    .optional()
    .default(3306),
  DB_USER: z.string().optional().default("zeppelin"),
  DB_PASSWORD: z.string().optional(), // Default is set to DOCKER_MYSQL_PASSWORD further below
  DB_DATABASE: z.string().optional().default("zeppelin"),
});

let toValidate = { ...process.env };
const envPath = path.join(rootDir, ".env");
if (fs.existsSync(envPath)) {
  const buf = fs.readFileSync(envPath);
  toValidate = { ...toValidate, ...dotenv.parse(buf) };
}

export const env = envType.parse(toValidate);

if (!env.DB_PASSWORD) {
  if (process.env.NODE_ENV === "production" && env.DOCKER_PROD_MYSQL_PASSWORD) {
    env.DB_PASSWORD = env.DOCKER_PROD_MYSQL_PASSWORD;
  } else if (env.DOCKER_DEV_MYSQL_PASSWORD) {
    env.DB_PASSWORD = env.DOCKER_DEV_MYSQL_PASSWORD;
  }
}
