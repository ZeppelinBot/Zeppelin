import { GuildPluginData } from "knub";
import { LocateUserPluginType } from "../types";
import { removeUserIdFromActiveAlerts } from "./removeUserIdFromActiveAlerts";
import { VCAlert } from "../../../data/entities/VCAlert";

export async function clearExpiredAlert(pluginData: GuildPluginData<LocateUserPluginType>, alert: VCAlert) {
  await pluginData.state.alerts.delete(alert.id);
  await removeUserIdFromActiveAlerts(pluginData, alert.user_id);
}
