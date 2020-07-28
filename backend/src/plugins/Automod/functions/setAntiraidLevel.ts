import { User } from "eris";
import { PluginData } from "knub";
import { AutomodPluginType } from "../types";

export async function setAntiraidLevel(
  pluginData: PluginData<AutomodPluginType>,
  newLevel: string | null,
  user?: User,
) {
  pluginData.state.cachedAntiraidLevel = newLevel;
  await pluginData.state.antiraidLevels.set(newLevel);

  if (user) {
    // TODO: Log user action
  } else {
    // TODO: Log automatic action
  }
}
