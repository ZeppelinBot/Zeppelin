import { BasePluginType } from "vety";
import { z } from "zod";
import { GuildMemberCache } from "../../data/GuildMemberCache.js";

export const zGuildMemberCacheConfig = z.strictObject({});

export interface GuildMemberCachePluginType extends BasePluginType {
  configSchema: typeof zGuildMemberCacheConfig;
  state: {
    memberCache: GuildMemberCache;
    saveInterval: NodeJS.Timeout;
    initialUpdatedMembers: Set<string>;
  };
}
