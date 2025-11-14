import { GuildPluginData } from "vety";
import { ReactionRolesPluginType } from "../types.js";
import { applyReactionRoleReactionsToMessage } from "./applyReactionRoleReactionsToMessage.js";

export async function refreshReactionRoles(
  pluginData: GuildPluginData<ReactionRolesPluginType>,
  channelId: string,
  messageId: string,
) {
  const pendingKey = `${channelId}-${messageId}`;
  if (pluginData.state.pendingRefreshes.has(pendingKey)) return;
  pluginData.state.pendingRefreshes.add(pendingKey);

  try {
    const reactionRoles = await pluginData.state.reactionRoles.getForMessage(messageId);
    await applyReactionRoleReactionsToMessage(pluginData, channelId, messageId, reactionRoles);
  } finally {
    pluginData.state.pendingRefreshes.delete(pendingKey);
  }
}
