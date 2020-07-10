import { locateUserEvent } from "../types";
import { sendAlerts } from "../utils/sendAlerts";
import { VoiceChannel, TextableChannel } from "eris";

export const ChannelLeaveEvt = locateUserEvent({
  event: "voiceChannelLeave",

  async listener(meta) {
    const triggeredAlerts = await meta.pluginData.state.alerts.getAlertsByUserId(meta.args.member.id);
    const voiceChannel = meta.args.oldChannel as VoiceChannel;

    triggeredAlerts.forEach(alert => {
      const txtChannel = meta.pluginData.client.getChannel(alert.channel_id) as TextableChannel;
      txtChannel.createMessage(
        `🔴 <@!${alert.requestor_id}> the user <@!${alert.user_id}> disconnected out of \`${voiceChannel.name}\``,
      );
    });
  },
});
