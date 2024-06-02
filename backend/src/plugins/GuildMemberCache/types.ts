import { BasePluginType } from "knub";
import { z } from "zod";
import { GuildMemberCache } from "../../data/GuildMemberCache.js";

export const zGuildMemberCacheConfig = z.strictObject({});

export interface GuildMemberCachePluginType extends BasePluginType {
  config: z.infer<typeof zGuildMemberCacheConfig>;
  state: {
    memberCache: GuildMemberCache;
    saveInterval: NodeJS.Timeout;
    initialUpdatedMembers: Set<string>;
  };
}
