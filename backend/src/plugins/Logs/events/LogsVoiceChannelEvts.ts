import { logsEvt } from "../types";
import { stripObjectToScalars } from "../../../utils";
import { LogType } from "../../../data/LogType";

export const LogsVoiceJoinEvt = logsEvt({
  event: "voiceChannelJoin",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.VOICE_CHANNEL_JOIN, {
      member: stripObjectToScalars(meta.args.member, ["user", "roles"]),
      channel: stripObjectToScalars(meta.args.newChannel),
    });
  },
});

export const LogsVoiceLeaveEvt = logsEvt({
  event: "voiceChannelLeave",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.VOICE_CHANNEL_LEAVE, {
      member: stripObjectToScalars(meta.args.member, ["user", "roles"]),
      channel: stripObjectToScalars(meta.args.oldChannel),
    });
  },
});

export const LogsVoiceSwitchEvt = logsEvt({
  event: "voiceChannelSwitch",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.VOICE_CHANNEL_MOVE, {
      member: stripObjectToScalars(meta.args.member, ["user", "roles"]),
      oldChannel: stripObjectToScalars(meta.args.oldChannel),
      newChannel: stripObjectToScalars(meta.args.newChannel),
    });
  },
});
