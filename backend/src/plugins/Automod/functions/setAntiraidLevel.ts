import { User } from "discord.js";
import { GuildPluginData } from "knub";
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
