import { ContextMenuInteraction } from "discord.js";
import { GuildPluginData } from "knub";
import { ContextMenuPluginType } from "../types";
import { hardcodedActions } from "./hardcodedContextOptions";

export async function routeContextAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  interaction: ContextMenuInteraction,
) {
  const contextLink = await pluginData.state.contextMenuLinks.get(interaction.commandId);
  if (!contextLink) return;
  hardcodedActions[contextLink.action_name](pluginData, interaction);
}
