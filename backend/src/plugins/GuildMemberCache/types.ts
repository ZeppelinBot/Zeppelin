import { BasePluginType } from "knub";
import { GuildMemberCache } from "../../data/GuildMemberCache.js";
import { z } from "zod";

export const zGuildMemberCacheConfig = z.strictObject({});

export interface GuildMemberCachePluginType extends BasePluginType {
  config: z.infer<typeof zGuildMemberCacheConfig>;
  state: {
    memberCache: GuildMemberCache;
    saveInterval: NodeJS.Timeout;
    initialUpdatedMembers: Set<string>;
  };
}
