import { Client, User } from "discord.js";

const getOrFetchUserPromises: Map<string, Promise<User | undefined>> = new Map();

/**
 * Gets a user from cache or fetches it from the API if not cached.
 * Concurrent requests are merged.
 */
export async function getOrFetchUser(bot: Client, userId: string): Promise<User | undefined> {
  const cachedUser = bot.users.cache.get(userId);
  if (cachedUser) {
    return cachedUser;
  }

  if (!getOrFetchUserPromises.has(userId)) {
    getOrFetchUserPromises.set(
      userId,
      bot.users.fetch(userId)
        .catch(() => undefined)
        .finally(() => {
          getOrFetchUserPromises.delete(userId);
        }),
    );
  }
  return getOrFetchUserPromises.get(userId)!;
}
