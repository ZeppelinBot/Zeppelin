import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { rootDir } from "./paths";
import { z } from "zod";

const envType = z.object({
  KEY: z.string().length(32),

  CLIENT_ID: z.string(),
  CLIENT_SECRET: z.string(),
  BOT_TOKEN: z.string(),

  OAUTH_CALLBACK_URL: z.string().url(),
  DASHBOARD_DOMAIN: z.string(),
  API_DOMAIN: z.string(),

  STAFF: z.preprocess((v) => String(v).split(","), z.array(z.string())).optional(),

  PHISHERMAN_API_KEY: z.string().optional(),

  API_PORT: z.preprocess((v) => Number(v), z.number().min(1).max(65535)),

  DOCKER_MYSQL_PASSWORD: z.string().optional(), // Included here for the DB_PASSWORD default in development

  DB_HOST: z.string().optional().default("mysql"),
  DB_PORT: z
    .preprocess((v) => Number(v), z.number())
    .optional()
    .default(3306),
  DB_USER: z.string().optional().default("zeppelin"),
  DB_PASSWORD: z.string().optional(), // Default is set to DOCKER_MYSQL_PASSWORD further below
  DB_DATABASE: z.string().optional().default("zeppelin"),
});

let toValidate = {};
const envPath = path.join(rootDir, ".env");
if (fs.existsSync(envPath)) {
  const buf = fs.readFileSync(envPath);
  toValidate = dotenv.parse(buf);
}

export const env = envType.parse(toValidate);

if (env.DOCKER_MYSQL_PASSWORD && !env.DB_PASSWORD) {
  env.DB_PASSWORD = env.DOCKER_MYSQL_PASSWORD;
}
