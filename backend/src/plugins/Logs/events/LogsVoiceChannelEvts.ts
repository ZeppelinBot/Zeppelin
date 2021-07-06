import { channelToConfigAccessibleChannel, memberToConfigAccessibleMember } from "src/utils/configAccessibleObjects";
import { LogType } from "../../../data/LogType";
import { stripObjectToScalars } from "../../../utils";
import { logsEvt } from "../types";

export const LogsVoiceStateUpdateEvt = logsEvt({
  event: "voiceStateUpdate",

  async listener(meta) {
    const oldChannel = meta.args.oldState.channel;
    const newChannel = meta.args.newState.channel;
    const member = meta.args.newState.member ?? meta.args.oldState.member!;

    if (!newChannel && oldChannel) {
      // Leave evt
      meta.pluginData.state.guildLogs.log(LogType.VOICE_CHANNEL_LEAVE, {
        member: memberToConfigAccessibleMember(member),
        oldChannel: channelToConfigAccessibleChannel(oldChannel!),
      });
    } else if (!oldChannel && newChannel) {
      // Join Evt
      meta.pluginData.state.guildLogs.log(LogType.VOICE_CHANNEL_JOIN, {
        member: memberToConfigAccessibleMember(member),
        newChannel: channelToConfigAccessibleChannel(newChannel),
      });
    } else {
      meta.pluginData.state.guildLogs.log(LogType.VOICE_CHANNEL_MOVE, {
        member: memberToConfigAccessibleMember(member),
        oldChannel: channelToConfigAccessibleChannel(oldChannel!),
        newChannel: channelToConfigAccessibleChannel(newChannel!),
      });
    }
  },
});
