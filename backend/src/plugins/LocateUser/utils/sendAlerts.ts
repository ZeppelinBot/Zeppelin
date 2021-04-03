import { GuildPluginData } from "knub";
import { LocateUserPluginType } from "../types";
import { resolveMember } from "../../../utils";
import { sendWhere } from "./sendWhere";
import { TextableChannel } from "eris";
import { moveMember } from "./moveMember";

export async function sendAlerts(pluginData: GuildPluginData<LocateUserPluginType>, userId: string) {
  const triggeredAlerts = await pluginData.state.alerts.getAlertsByUserId(userId);
  const member = await resolveMember(pluginData.client, pluginData.guild, userId);
  if (!member) return;

  triggeredAlerts.forEach((alert) => {
    const prepend = `<@!${alert.requestor_id}>, an alert requested by you has triggered!\nReminder: \`${alert.body}\`\n`;
    const txtChannel = pluginData.client.getChannel(alert.channel_id) as TextableChannel;
    sendWhere(pluginData, member, txtChannel, prepend);
    if (alert.active) {
      moveMember(pluginData, alert.requestor_id, member, txtChannel);
    }
  });
}
