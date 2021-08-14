import { Client, GuildPreview, Snowflake } from "discord.js";
import { memoize, MINUTES } from "../../../utils";

/**
 * Memoized getGuildPreview
 */
export function getGuildPreview(client: Client, guildId: string): Promise<GuildPreview | null> {
  return memoize(
    () => client.fetchGuildPreview(guildId as Snowflake).catch(() => null),
    `getGuildPreview_${guildId}`,
    10 * MINUTES,
  );
}
