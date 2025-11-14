import { Client, User } from "discord.js";
import { redis } from "../data/redis.js";
import { incrementDebugCounter } from "../debugCounters.js";

const getOrFetchUserPromises: Map<string, Promise<User | undefined>> = new Map();

const UNKNOWN_KEY = "__UNKNOWN__";

const baseCacheTimeSeconds = 60 * 60; // 1 hour
const cacheTimeJitterSeconds = 5 * 60; // 5 minutes

// Use jitter on cache time to avoid tons of keys expiring at the same time
const generateCacheTime = () => {
  const jitter = Math.floor(Math.random() * cacheTimeJitterSeconds);
  return baseCacheTimeSeconds + jitter;
};

/**
 * Gets a user from cache or fetches it from the API if not cached.
 * Concurrent requests are merged.
 */
export async function getOrFetchUser(bot: Client, userId: string): Promise<User | undefined> {
  // 1. Check Discord.js cache
  const cachedUser = bot.users.cache.get(userId);
  if (cachedUser) {
    incrementDebugCounter("getOrFetchUser:djsCache");
    return cachedUser;
  }

  // 2. Check Redis
  const redisCacheKey = `cache:user:${userId}`;
  const userData = await redis.get(redisCacheKey);
  if (userData) {
    if (userData === UNKNOWN_KEY) {
      incrementDebugCounter("getOrFetchUser:redisCache:unknown");
      return undefined;
    }
    incrementDebugCounter("getOrFetchUser:redisCache:hit");
    // @ts-expect-error Replace with a proper solution once that exists
    return new User(bot, JSON.parse(userData));
  }

  if (!getOrFetchUserPromises.has(userId)) {
    incrementDebugCounter("getOrFetchUser:fresh");
    getOrFetchUserPromises.set(
      userId,
      bot.users
        .fetch(userId)
        .catch(async () => {
          return undefined;
        })
        .then(async (user) => {
          const cacheValue = user ? JSON.stringify(user.toJSON()) : UNKNOWN_KEY;
          await redis.set(redisCacheKey, cacheValue, {
            expiration: {
              type: "EX",
              value: generateCacheTime(),
            },
          });
          return user;
        })
        .finally(() => {
          getOrFetchUserPromises.delete(userId);
        }),
    );
  }
  return getOrFetchUserPromises.get(userId)!;
}
