import { BasePluginType } from "knub";
import { GuildMemberCache } from "../../data/GuildMemberCache.js";

export interface GuildMemberCachePluginType extends BasePluginType {
  state: {
    memberCache: GuildMemberCache;
    saveInterval: NodeJS.Timeout;
    initialUpdatedMembers: Set<string>;
  };
}
