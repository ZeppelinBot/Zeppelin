import { SECONDS } from "../../../utils";
import { removeUserIdFromActiveAlerts } from "./removeUserIdFromActiveAlerts";
import { GuildPluginData } from "knub";
import { LocateUserPluginType } from "../types";

const ALERT_LOOP_TIME = 30 * SECONDS;

export async function outdatedAlertsLoop(pluginData: GuildPluginData<LocateUserPluginType>) {
  const outdatedAlerts = await pluginData.state.alerts.getOutdatedAlerts();

  for (const alert of outdatedAlerts) {
    await pluginData.state.alerts.delete(alert.id);
    await removeUserIdFromActiveAlerts(pluginData, alert.user_id);
  }

  if (!pluginData.state.unloaded) {
    pluginData.state.outdatedAlertsTimeout = setTimeout(() => outdatedAlertsLoop(pluginData), ALERT_LOOP_TIME);
  }
}
