import { guildPluginEventListener } from "knub";
import { updateMemberCacheForMember } from "../functions/updateMemberCacheForMember";
import { GuildMemberCachePluginType } from "../types";

export const updateMemberCacheOnVoiceStateUpdate = guildPluginEventListener<GuildMemberCachePluginType>()({
  event: "voiceStateUpdate",
  listener({ pluginData, args }) {
    const memberId = args.newState.member?.id;
    if (!memberId) {
      return;
    }
    // Update each member once per guild load when we see a message from them
    const key = `${pluginData.guild.id}-${memberId}`;
    if (pluginData.state.initialUpdatedMembers.has(key)) {
      return;
    }
    updateMemberCacheForMember(pluginData, memberId);
    pluginData.state.initialUpdatedMembers.add(key);
  },
});
