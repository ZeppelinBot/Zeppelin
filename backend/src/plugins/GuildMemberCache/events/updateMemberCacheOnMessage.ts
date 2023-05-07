import { guildPluginEventListener } from "knub";
import { updateMemberCacheForMember } from "../functions/updateMemberCacheForMember";
import { GuildMemberCachePluginType } from "../types";

export const updateMemberCacheOnMessage = guildPluginEventListener<GuildMemberCachePluginType>()({
  event: "messageCreate",
  listener({ pluginData, args }) {
    // Update each member once per guild load when we see a message from them
    const key = `${pluginData.guild.id}-${args.message.author.id}`;
    if (pluginData.state.initialUpdatedMembers.has(key)) {
      return;
    }
    updateMemberCacheForMember(pluginData, args.message.author.id);
    pluginData.state.initialUpdatedMembers.add(key);
  },
});
