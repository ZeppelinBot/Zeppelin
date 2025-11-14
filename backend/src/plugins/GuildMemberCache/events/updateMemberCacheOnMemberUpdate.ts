import { guildPluginEventListener } from "vety";
import { updateMemberCacheForMember } from "../functions/updateMemberCacheForMember.js";
import { GuildMemberCachePluginType } from "../types.js";

export const updateMemberCacheOnMemberUpdate = guildPluginEventListener<GuildMemberCachePluginType>()({
  event: "guildMemberUpdate",
  async listener({ pluginData, args: { newMember } }) {
    updateMemberCacheForMember(pluginData, newMember.id);
  },
});
