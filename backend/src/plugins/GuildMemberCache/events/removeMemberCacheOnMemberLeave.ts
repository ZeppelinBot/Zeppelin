import { guildPluginEventListener } from "knub";
import { MINUTES } from "../../../utils";
import { GuildMemberCachePluginType } from "../types";

const DELETION_DELAY = 2 * MINUTES;

export const removeMemberCacheOnMemberLeave = guildPluginEventListener<GuildMemberCachePluginType>()({
  event: "guildMemberRemove",
  async listener({ pluginData, args: { member } }) {
    pluginData.state.memberCache.markMemberForDeletion(member.id);
  },
});
