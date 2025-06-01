import { Guild, GuildMember } from "discord.js";

const getOrFetchGuildMemberPromises: Map<string, Promise<GuildMember | undefined>> = new Map();
/**
 * Gets a guild member from cache or fetches it from the API if not cached.
 * Concurrent requests are merged.
 */
export async function getOrFetchGuildMember(guild: Guild, memberId: string): Promise<GuildMember | undefined> {
  const cachedMember = guild.members.cache.get(memberId);
  if (cachedMember) {
    return cachedMember;
  }

  const key = `${guild.id}-${memberId}`;
  if (!getOrFetchGuildMemberPromises.has(key)) {
    getOrFetchGuildMemberPromises.set(
      key,
      guild.members
        .fetch(memberId)
        .catch(() => undefined)
        .finally(() => {
          getOrFetchGuildMemberPromises.delete(key);
        }),
    );
  }
  return getOrFetchGuildMemberPromises.get(key)!;
}
