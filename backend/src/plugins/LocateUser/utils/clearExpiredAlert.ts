import { GuildPluginData } from "vety";
import { VCAlert } from "../../../data/entities/VCAlert.js";
import { LocateUserPluginType } from "../types.js";
import { removeUserIdFromActiveAlerts } from "./removeUserIdFromActiveAlerts.js";

export async function clearExpiredAlert(pluginData: GuildPluginData<LocateUserPluginType>, alert: VCAlert) {
  await pluginData.state.alerts.delete(alert.id);
  await removeUserIdFromActiveAlerts(pluginData, alert.user_id);
}
