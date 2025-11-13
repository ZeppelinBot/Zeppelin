import { guildPluginEventListener } from "vety";
import { GuildMemberCachePluginType } from "../types.js";

export const cancelDeletionOnMemberJoin = guildPluginEventListener<GuildMemberCachePluginType>()({
  event: "guildMemberAdd",
  async listener({ pluginData, args: { member } }) {
    pluginData.state.memberCache.unmarkMemberForDeletion(member.id);
  },
});
