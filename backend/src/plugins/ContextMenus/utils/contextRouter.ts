import { ContextMenuInteraction } from "discord.js";
import { GuildPluginData } from "knub";
import { availableActions } from "../actions/availableActions";
import { ContextMenuPluginType } from "../types";

export async function routeContextAction(
  pluginData: GuildPluginData<ContextMenuPluginType>,
  interaction: ContextMenuInteraction,
) {
  const contextLink = await pluginData.state.contextMenuLinks.get(interaction.commandId);
  if (!contextLink) return;
  const contextActions = Object.entries(pluginData.config.get().context_actions);

  const configLink = contextActions.find(x => x[0] === contextLink.action_name);
  if (!configLink) return;

  for (const [actionName, actionConfig] of Object.entries(configLink[1].action)) {
    if (actionConfig == null) return;
    const action = availableActions[actionName];
    action.apply({
      actionName,
      pluginData,
      actionConfig,
      interaction,
    });
    return;
  }
}
