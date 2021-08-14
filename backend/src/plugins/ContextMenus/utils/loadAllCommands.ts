import { ApplicationCommandData } from "discord.js";
import { LogType } from "src/data/LogType";
import { LogsPlugin } from "src/plugins/Logs/LogsPlugin";
import { GuildPluginData } from "knub";
import { ContextMenuPluginType, ContextMenuTypeNameToNumber } from "../types";

export async function loadAllCommands(pluginData: GuildPluginData<ContextMenuPluginType>) {
  const comms = await pluginData.client.application!.commands;
  const actions = pluginData.config.get().context_actions;
  const newCommands: ApplicationCommandData[] = [];
  const addedNames: string[] = [];

  for (const [name, configAction] of Object.entries(actions)) {
    if (!configAction.enabled) continue;

    const data: ApplicationCommandData = {
      type: ContextMenuTypeNameToNumber[configAction.type],
      name: configAction.label,
    };
    addedNames.push(name);
    newCommands.push(data);
  }

  const setCommands = await comms.set(newCommands, pluginData.guild.id).catch(e => {
    pluginData.getPlugin(LogsPlugin).log(LogType.BOT_ALERT, `Unable to overwrite context menus: ${e}`);
    return undefined;
  });
  if (!setCommands) return;

  const setCommandsArray = [...setCommands.values()];
  await pluginData.state.contextMenuLinks.deleteAll();

  for (let i = 0; i < setCommandsArray.length; i++) {
    const command = setCommandsArray[i];
    pluginData.state.contextMenuLinks.create(command.id, addedNames[i]);
  }
}
