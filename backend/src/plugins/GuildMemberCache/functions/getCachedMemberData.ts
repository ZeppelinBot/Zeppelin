import { GuildPluginData } from "vety";
import { MemberCacheItem } from "../../../data/entities/MemberCacheItem.js";
import { GuildMemberCachePluginType } from "../types.js";

export function getCachedMemberData(
  pluginData: GuildPluginData<GuildMemberCachePluginType>,
  userId: string,
): Promise<MemberCacheItem | null> {
  return pluginData.state.memberCache.getCachedMemberData(userId);
}
