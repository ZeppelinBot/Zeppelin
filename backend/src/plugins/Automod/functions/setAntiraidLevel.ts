import { User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { runAutomodOnAntiraidLevel } from "../events/runAutomodOnAntiraidLevel.js";
import { AutomodPluginType } from "../types.js";

export async function setAntiraidLevel(
  pluginData: GuildPluginData<AutomodPluginType>,
  newLevel: string | null,
  user?: User,
) {
  const oldLevel = pluginData.state.cachedAntiraidLevel;
  pluginData.state.cachedAntiraidLevel = newLevel;
  await pluginData.state.antiraidLevels.set(newLevel);

  runAutomodOnAntiraidLevel(pluginData, newLevel, oldLevel, user);

  const logs = pluginData.getPlugin(LogsPlugin);

  if (user) {
    logs.logSetAntiraidUser({
      level: newLevel ?? "off",
      user,
    });
  } else {
    logs.logSetAntiraidAuto({
      level: newLevel ?? "off",
    });
  }
}
