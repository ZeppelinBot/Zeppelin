import { guildPluginEventListener } from "vety";
import { GuildMemberCachePluginType } from "../types.js";

export const removeMemberCacheOnMemberLeave = guildPluginEventListener<GuildMemberCachePluginType>()({
  event: "guildMemberRemove",
  async listener({ pluginData, args: { member } }) {
    pluginData.state.memberCache.markMemberForDeletion(member.id);
  },
});
