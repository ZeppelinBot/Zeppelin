/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from "@adonisjs/core/env";

export const rootEnv = await Env.create(new URL("../../", import.meta.url), {
  PORTAL_URL: Env.schema.string.optional(),
  KEY: Env.schema.string(),
  DB_HOST: Env.schema.string.optional(),
  DB_PORT: Env.schema.number.optional(),
  DB_USER: Env.schema.string.optional(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string.optional(),
  REDIS_URL: Env.schema.string.optional(),
  DEVELOPMENT_MYSQL_PASSWORD: Env.schema.string.optional(),
  DEVELOPMENT_VITE_ALLOWED_HOSTS: Env.schema.string.optional(),
  DEVELOPMENT_PORTAL_PORT: Env.schema.number.optional(),
  STAFF: Env.schema.string.optional(),

  // Discord client id/secret
  CLIENT_ID: Env.schema.string(),
  CLIENT_SECRET: Env.schema.string(),
});

export const portalEnv = await Env.create(new URL("../", import.meta.url), {
  SESSION_DRIVER: Env.schema.enum.optional(["redis", "memory"] as const),
  LOG_LEVEL: Env.schema.string.optional(),
  LIMITER_STORE: Env.schema.enum.optional(["redis", "memory"] as const),
  PORTAL_PRIVACY_POLICY_PATH: Env.schema.string.optional(),
});
