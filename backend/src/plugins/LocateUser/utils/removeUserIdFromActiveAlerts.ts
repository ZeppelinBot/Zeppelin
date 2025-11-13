import { GuildPluginData } from "vety";
import { LocateUserPluginType } from "../types.js";

export async function removeUserIdFromActiveAlerts(pluginData: GuildPluginData<LocateUserPluginType>, userId: string) {
  const index = pluginData.state.usersWithAlerts.indexOf(userId);
  if (index > -1) {
    pluginData.state.usersWithAlerts.splice(index, 1);
  }
}
