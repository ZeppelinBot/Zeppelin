import { SECONDS } from "src/utils";
import { removeUserIdFromActiveAlerts } from "./removeUserIdFromActiveAlerts";

const ALERT_LOOP_TIME = 30 * SECONDS;

export async function outdatedAlertsLoop(pluginData) {
  const outdatedAlerts = await pluginData.state.alerts.getOutdatedAlerts();

  for (const alert of outdatedAlerts) {
    await pluginData.state.alerts.delete(alert.id);
    await removeUserIdFromActiveAlerts(pluginData, alert.user_id);
  }

  if (!pluginData.state.unloaded) {
    pluginData.state.outdatedAlertsTimeout = setTimeout(() => outdatedAlertsLoop(pluginData), ALERT_LOOP_TIME);
  }
}
