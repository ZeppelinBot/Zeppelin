import { ApplicationCommandData, ApplicationCommandType } from "discord.js";
import { GuildPluginData } from "knub";
import { LogsPlugin } from "../../../plugins/Logs/LogsPlugin";
import { ContextMenuPluginType } from "../types";
import { hardcodedContext } from "./hardcodedContextOptions";

export async function loadAllCommands(pluginData: GuildPluginData<ContextMenuPluginType>) {
  const comms = await pluginData.client.application!.commands;
  const cfg = pluginData.config.get();
  const newCommands: ApplicationCommandData[] = [];
  const addedNames: string[] = [];

  for (const [name, label] of Object.entries(hardcodedContext)) {
    if (!cfg[name]) continue;

    const type = name.startsWith("user") ? ApplicationCommandType.User : ApplicationCommandType.Message;
    const data: ApplicationCommandData = {
      type,
      name: label,
    };

    addedNames.push(name);
    newCommands.push(data);
  }

  const setCommands = await comms.set(newCommands, pluginData.guild.id).catch((e) => {
    pluginData.getPlugin(LogsPlugin).logBotAlert({ body: `Unable to overwrite context menus: ${e}` });
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
