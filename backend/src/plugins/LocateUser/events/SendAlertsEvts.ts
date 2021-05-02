import { locateUserEvt } from "../types";
import { sendAlerts } from "../utils/sendAlerts";
import { TextableChannel, VoiceChannel } from "eris";

export const ChannelJoinAlertsEvt = locateUserEvt({
  event: "voiceChannelJoin",

  async listener(meta) {
    if (meta.pluginData.state.usersWithAlerts.includes(meta.args.member.id)) {
      sendAlerts(meta.pluginData, meta.args.member.id);
    }
  },
});

export const ChannelSwitchAlertsEvt = locateUserEvt({
  event: "voiceChannelSwitch",

  async listener(meta) {
    if (meta.pluginData.state.usersWithAlerts.includes(meta.args.member.id)) {
      sendAlerts(meta.pluginData, meta.args.member.id);
    }
  },
});

export const ChannelLeaveAlertsEvt = locateUserEvt({
  event: "voiceChannelLeave",

  async listener(meta) {
    const triggeredAlerts = await meta.pluginData.state.alerts.getAlertsByUserId(meta.args.member.id);
    const voiceChannel = meta.args.oldChannel as VoiceChannel;

    for (let i = 0; i < triggeredAlerts.length; ++i) {
      const alert = triggeredAlerts[i];
      const txtChannel = meta.pluginData.client.getChannel(alert.channel_id) as TextableChannel;
      txtChannel.createMessage(
        `🔴 <@!${alert.requestor_id}> the user <@!${alert.user_id}> disconnected out of \`${voiceChannel.name}\``,
      );
    }
  },
});
