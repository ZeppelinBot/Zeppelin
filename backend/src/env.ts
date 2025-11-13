import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { rootDir } from "./paths.js";

const envType = z.object({
  KEY: z.string().length(32),

  CLIENT_ID: z.string().min(16),
  CLIENT_SECRET: z.string().length(32),
  BOT_TOKEN: z.string().min(50),

  DASHBOARD_URL: z.string().url(),
  API_URL: z.string().url(),

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
  FISHFISH_API_KEY: z.string().optional(),

  DEFAULT_SUCCESS_EMOJI: z.string().optional().default("✅"),
  DEFAULT_ERROR_EMOJI: z.string().optional().default("❌"),

  DB_HOST: z.string().optional(),
  DB_PORT: z.preprocess((v) => Number(v), z.number()).optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_DATABASE: z.string().optional(),

  REDIS_URL: z.string().default("redis://redis:6379"),

  DEVELOPMENT_MYSQL_PASSWORD: z.string().optional(),

  API_PATH_PREFIX: z.string().optional(),

  DEBUG: z
    .string()
    .optional()
    .transform((str) => str === "true"),

  NODE_ENV: z.string().default("development"),
});

let toValidate = { ...process.env };
const envPath = path.join(rootDir, ".env");
if (fs.existsSync(envPath)) {
  const buf = fs.readFileSync(envPath);
  toValidate = { ...toValidate, ...dotenv.parse(buf) };
}

export const env = envType.parse(toValidate);
