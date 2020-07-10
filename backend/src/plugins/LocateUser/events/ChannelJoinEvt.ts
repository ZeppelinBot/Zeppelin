import { locateUserEvent } from "../types";
import { sendAlerts } from "../utils/sendAlerts";

export const ChannelJoinEvt = locateUserEvent({
  event: "voiceChannelJoin",

  async listener(meta) {
    if (meta.pluginData.state.usersWithAlerts.includes(meta.args.member.id)) {
      sendAlerts(meta.pluginData, meta.args.member.id);
    }
  },
});

export const ChannelSwitchEvt = locateUserEvent({
  event: "voiceChannelSwitch",

  async listener(meta) {
    if (meta.pluginData.state.usersWithAlerts.includes(meta.args.member.id)) {
      sendAlerts(meta.pluginData, meta.args.member.id);
    }
  },
});
