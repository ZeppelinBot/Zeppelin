import { createClient } from "redis";
import { env } from "../env.js";

// Silly type inference issue... https://github.com/redis/node-redis/issues/1732#issuecomment-979977316
type RedisClient = ReturnType<typeof createClient>;
export const redis: RedisClient = await createClient({ url: env.REDIS_URL }).connect();
