import { LogType } from "../../../data/LogType";
import { stripObjectToScalars } from "../../../utils";
import { logsEvt } from "../types";

export const LogsVoiceStateUpdateEvt = logsEvt({
  event: "voiceStateUpdate",

  async listener(meta) {
    const oldChannel = meta.args.oldState.channel;
    const newChannel = meta.args.newState.channel;
    const member = meta.args.newState.member ?? meta.args.oldState.member!;

    if (!newChannel) {
      // Leave evt
      meta.pluginData.state.guildLogs.log(LogType.VOICE_CHANNEL_LEAVE, {
        member: stripObjectToScalars(member, ["user", "roles"]),
        oldChannel: stripObjectToScalars(oldChannel),
        newChannel: stripObjectToScalars(newChannel),
      });
    } else if (!oldChannel) {
      // Join Evt
      meta.pluginData.state.guildLogs.log(LogType.VOICE_CHANNEL_JOIN, {
        member: stripObjectToScalars(member, ["user", "roles"]),
        oldChannel: stripObjectToScalars(oldChannel),
        newChannel: stripObjectToScalars(newChannel),
      });
    } else {
      meta.pluginData.state.guildLogs.log(LogType.VOICE_CHANNEL_MOVE, {
        member: stripObjectToScalars(member, ["user", "roles"]),
        oldChannel: stripObjectToScalars(oldChannel),
        newChannel: stripObjectToScalars(newChannel),
      });
    }
  },
});
