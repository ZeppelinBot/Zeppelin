import { GuildPluginData } from "knub";
import { ReactionRolesPluginType } from "../types";
import { applyReactionRoleReactionsToMessage } from "./applyReactionRoleReactionsToMessage";

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
