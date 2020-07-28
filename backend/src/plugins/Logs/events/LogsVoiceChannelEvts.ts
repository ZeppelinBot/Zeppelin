import { logsEvent } from "../types";
import { stripObjectToScalars } from "src/utils";
import { LogType } from "src/data/LogType";

export const LogsVoiceJoinEvt = logsEvent({
  event: "voiceChannelJoin",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.VOICE_CHANNEL_JOIN, {
      member: stripObjectToScalars(meta.args.member, ["user", "roles"]),
      channel: stripObjectToScalars(meta.args.newChannel),
    });
  },
});

export const LogsVoiceLeaveEvt = logsEvent({
  event: "voiceChannelLeave",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.VOICE_CHANNEL_LEAVE, {
      member: stripObjectToScalars(meta.args.member, ["user", "roles"]),
      channel: stripObjectToScalars(meta.args.oldChannel),
    });
  },
});

export const LogsVoiceSwitchEvt = logsEvent({
  event: "voiceChannelSwitch",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.VOICE_CHANNEL_MOVE, {
      member: stripObjectToScalars(meta.args.member, ["user", "roles"]),
      oldChannel: stripObjectToScalars(meta.args.oldChannel),
      newChannel: stripObjectToScalars(meta.args.newChannel),
    });
  },
});
