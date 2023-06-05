import { GuildPluginData } from "knub";
import { GuildMemberCachePluginType } from "../types";

export async function updateMemberCacheForMember(
  pluginData: GuildPluginData<GuildMemberCachePluginType>,
  userId: string,
) {
  const upToDateMember = await pluginData.guild.members.fetch(userId);
  const roles = Array.from(upToDateMember.roles.cache.keys())
    // Filter out @everyone role
    .filter((roleId) => roleId !== pluginData.guild.id);
  pluginData.state.memberCache.setCachedMemberData(upToDateMember.id, {
    username: upToDateMember.user.username,
    nickname: upToDateMember.nickname,
    roles,
  });
}
