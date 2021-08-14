import { Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { resolveMember } from "../../../utils";
import { LocateUserPluginType } from "../types";
import { moveMember } from "./moveMember";
import { sendWhere } from "./sendWhere";

export async function sendAlerts(pluginData: GuildPluginData<LocateUserPluginType>, userId: string) {
  const triggeredAlerts = await pluginData.state.alerts.getAlertsByUserId(userId);
  const member = await resolveMember(pluginData.client, pluginData.guild, userId);
  if (!member) return;

  triggeredAlerts.forEach(alert => {
    const prepend = `<@!${alert.requestor_id}>, an alert requested by you has triggered!\nReminder: \`${alert.body}\`\n`;
    const txtChannel = pluginData.guild.channels.resolve(alert.channel_id as Snowflake) as TextChannel;
    sendWhere(pluginData, member, txtChannel, prepend);
    if (alert.active) {
      moveMember(pluginData, alert.requestor_id, member, txtChannel);
    }
  });
}
