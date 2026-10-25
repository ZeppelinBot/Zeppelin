import { rootEnv } from "#start/env";
import { defineConfig } from "@adonisjs/redis";
import type { InferConnections } from "@adonisjs/redis/types";

const url = new URL(rootEnv.get("REDIS_URL", "redis://redis:6379"));

const redisConfig = defineConfig({
  connection: "main",
  connections: {
    main: {
      host: url.hostname,
      port: url.port ? Number(url.port) : 6379,
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      db: url.pathname !== "/" && url.pathname ? Number(url.pathname.slice(1)) : 0,
      ...(url.protocol === "rediss:" ? { tls: {} } : {}),
      keyPrefix: "portal:",
    },
  },
});

export default redisConfig;

declare module "@adonisjs/redis/types" {
  interface RedisConnections extends InferConnections<typeof redisConfig> {}
}
