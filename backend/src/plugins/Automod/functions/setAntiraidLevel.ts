import { User } from "eris";
import { GuildPluginData } from "knub";
import { AutomodPluginType } from "../types";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { LogType } from "../../../data/LogType";
import { stripObjectToScalars } from "../../../utils";
import { runAutomodOnAntiraidLevel } from "../events/runAutomodOnAntiraidLevel";

export async function setAntiraidLevel(
  pluginData: GuildPluginData<AutomodPluginType>,
  newLevel: string | null,
  user?: User,
) {
  pluginData.state.cachedAntiraidLevel = newLevel;
  await pluginData.state.antiraidLevels.set(newLevel);

  runAutomodOnAntiraidLevel(pluginData, newLevel);

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
