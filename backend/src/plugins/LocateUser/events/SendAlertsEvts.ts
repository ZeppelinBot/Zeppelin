import { Snowflake, TextChannel } from "discord.js";
import { locateUserEvt } from "../types";
import { sendAlerts } from "../utils/sendAlerts";

export const VoiceStateUpdateAlertEvt = locateUserEvt({
  event: "voiceStateUpdate",

  async listener(meta) {
    const memberId = meta.args.oldState.member ? meta.args.oldState.member.id : meta.args.newState.member!.id;

    if (meta.args.newState.channel != null) {
      if (meta.pluginData.state.usersWithAlerts.includes(memberId)) {
        sendAlerts(meta.pluginData, memberId);
      }
    } else {
      const triggeredAlerts = await meta.pluginData.state.alerts.getAlertsByUserId(memberId);
      const voiceChannel = meta.args.oldState.channel!;

      triggeredAlerts.forEach(alert => {
        const txtChannel = meta.pluginData.guild.channels.resolve(alert.channel_id as Snowflake) as TextChannel;
        txtChannel.send(
          `🔴 <@!${alert.requestor_id}> the user <@!${alert.user_id}> disconnected out of \`<#!${voiceChannel.id}>\``,
        );
      });
    }
  },
});
