import { GuildMember, VoiceBasedChannel } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import { channelToTemplateSafeChannel, memberToTemplateSafeMember } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogVoiceChannelMoveData {
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
