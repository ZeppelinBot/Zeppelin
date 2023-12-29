import { guildPluginEventListener } from "knub";
import { updateMemberCacheForMember } from "../functions/updateMemberCacheForMember";
import { GuildMemberCachePluginType } from "../types";

export const updateMemberCacheOnMemberUpdate = guildPluginEventListener<GuildMemberCachePluginType>()({
  event: "guildMemberUpdate",
  async listener({ pluginData, args: { newMember } }) {
    updateMemberCacheForMember(pluginData, newMember.id);
  },
});
