import { User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { stripObjectToScalars } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { runAutomodOnAntiraidLevel } from "../events/runAutomodOnAntiraidLevel";
import { AutomodPluginType } from "../types";

export async function setAntiraidLevel(
  pluginData: GuildPluginData<AutomodPluginType>,
  newLevel: string | null,
  user?: User,
) {
  pluginData.state.cachedAntiraidLevel = newLevel;
  await pluginData.state.antiraidLevels.set(newLevel);

  runAutomodOnAntiraidLevel(pluginData, newLevel, user);

  const logs = pluginData.getPlugin(LogsPlugin);

  if (user) {
    logs.log(LogType.SET_ANTIRAID_USER, {
      level: newLevel ?? "off",
      user: stripObjectToScalars(user),
    });
  } else {
    logs.log(LogType.SET_ANTIRAID_AUTO, {
      level: newLevel ?? "off",
    });
  }
}
