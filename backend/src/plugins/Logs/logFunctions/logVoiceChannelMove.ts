import { GuildMember, VoiceBasedChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel, memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogVoiceChannelMoveData {
  member: GuildMember;
  oldChannel: VoiceBasedChannel;
  newChannel: VoiceBasedChannel;
}

export function logVoiceChannelMove(pluginData: GuildPluginData<LogsPluginType>, data: LogVoiceChannelMoveData) {
  return log(
    pluginData,
    LogType.VOICE_CHANNEL_MOVE,
    createTypedTemplateSafeValueContainer({
      member: memberToTemplateSafeMember(data.member),
      oldChannel: channelToTemplateSafeChannel(data.oldChannel),
      newChannel: channelToTemplateSafeChannel(data.newChannel),
    }),
    {
      userId: data.member.id,
      roles: Array.from(data.member.roles.cache.keys()),
      ...resolveChannelIds(data.newChannel),
      bot: data.member.user.bot,
    },
  );
}
