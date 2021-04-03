import { GuildPluginData } from "knub";
import { ReactionRolesPluginType } from "../types";
import { refreshReactionRoles } from "./refreshReactionRoles";

export async function runAutoRefresh(pluginData: GuildPluginData<ReactionRolesPluginType>) {
  // Refresh reaction roles on all reaction role messages
  const reactionRoles = await pluginData.state.reactionRoles.all();
  const idPairs = new Set(reactionRoles.map((r) => `${r.channel_id}-${r.message_id}`));
  for (const pair of idPairs) {
    const [channelId, messageId] = pair.split("-");
    await refreshReactionRoles(pluginData, channelId, messageId);
  }
}
