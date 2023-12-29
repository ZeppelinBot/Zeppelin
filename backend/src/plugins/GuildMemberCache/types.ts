import { BasePluginType } from "knub";
import { GuildMemberCache } from "../../data/GuildMemberCache";

export interface GuildMemberCachePluginType extends BasePluginType {
  state: {
    memberCache: GuildMemberCache;
    saveInterval: NodeJS.Timeout;
    initialUpdatedMembers: Set<string>;
  };
}
