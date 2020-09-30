import { GuildPluginData } from "knub";
import { LocateUserPluginType } from "../types";

export async function removeUserIdFromActiveAlerts(pluginData: GuildPluginData<LocateUserPluginType>, userId: string) {
  const index = pluginData.state.usersWithAlerts.indexOf(userId);
  if (index > -1) {
    pluginData.state.usersWithAlerts.splice(index, 1);
  }
}
