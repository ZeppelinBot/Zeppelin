import { guildPluginEventListener } from "knub";
import { GuildMemberCachePluginType } from "../types";

export const removeMemberCacheOnMemberLeave = guildPluginEventListener<GuildMemberCachePluginType>()({
  event: "guildMemberRemove",
  async listener({ pluginData, args: { member } }) {
    pluginData.state.memberCache.markMemberForDeletion(member.id);
  },
});
