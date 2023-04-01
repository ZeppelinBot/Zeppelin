import { GuildPluginData } from "knub";
import { VCAlert } from "../../../data/entities/VCAlert";
import { LocateUserPluginType } from "../types";
import { removeUserIdFromActiveAlerts } from "./removeUserIdFromActiveAlerts";

export async function clearExpiredAlert(pluginData: GuildPluginData<LocateUserPluginType>, alert: VCAlert) {
  await pluginData.state.alerts.delete(alert.id);
  await removeUserIdFromActiveAlerts(pluginData, alert.user_id);
}
