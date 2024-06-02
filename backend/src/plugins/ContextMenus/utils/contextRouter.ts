import { ContextMenuCommandInteraction } from "discord.js";
import { GuildPluginData } from "knub";
import { ContextMenuPluginType } from "../types.js";
import { hardcodedActions } from "./hardcodedContextOptions.js";

export async function routeContextAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  interaction: ContextMenuCommandInteraction,
) {
  const contextLink = await pluginData.state.contextMenuLinks.get(interaction.commandId);
  if (!contextLink) return;
  hardcodedActions[contextLink.action_name](pluginData, interaction);
}
