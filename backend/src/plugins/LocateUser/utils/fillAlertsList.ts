import { GuildPluginData } from "knub";
import { LocateUserPluginType } from "../types";

export async function fillActiveAlertsList(pluginData: GuildPluginData<LocateUserPluginType>) {
  const allAlerts = await pluginData.state.alerts.getAllGuildAlerts();

  for (let i = 0; i < allAlerts.length; ++i) {
    if (!pluginData.state.usersWithAlerts.includes(allAlerts[i].user_id)) {
      pluginData.state.usersWithAlerts.push(allAlerts[i].user_id);
    }
  }
}
