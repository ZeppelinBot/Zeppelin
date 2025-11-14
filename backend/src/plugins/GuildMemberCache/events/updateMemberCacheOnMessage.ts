import { guildPluginEventListener } from "vety";
import { updateMemberCacheForMember } from "../functions/updateMemberCacheForMember.js";
import { GuildMemberCachePluginType } from "../types.js";

export const updateMemberCacheOnMessage = guildPluginEventListener<GuildMemberCachePluginType>()({
  event: "messageCreate",
  listener({ pluginData, args }) {
    // Update each member once per guild load when we see a message from them
    if (pluginData.state.initialUpdatedMembers.has(args.message.author.id)) {
      return;
    }
    updateMemberCacheForMember(pluginData, args.message.author.id);
    pluginData.state.initialUpdatedMembers.add(args.message.author.id);
  },
});
