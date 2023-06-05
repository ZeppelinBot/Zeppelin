import { GuildPluginData } from "knub";
import { MemberCacheItem } from "../../../data/entities/MemberCacheItem";
import { GuildMemberCachePluginType } from "../types";

export function getCachedMemberData(
  pluginData: GuildPluginData<GuildMemberCachePluginType>,
  userId: string,
): Promise<MemberCacheItem | null> {
  return pluginData.state.memberCache.getCachedMemberData(userId);
}
