import { GuildPluginData } from "knub";
import { LocateUserPluginType } from "../types";

export async function fillActiveAlertsList(pluginData: GuildPluginData<LocateUserPluginType>) {
  const allAlerts = await pluginData.state.alerts.getAllGuildAlerts();

  allAlerts.forEach((alert) => {
    if (!pluginData.state.usersWithAlerts.includes(alert.user_id)) {
      pluginData.state.usersWithAlerts.push(alert.user_id);
    }
  });
}
