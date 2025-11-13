import { GuildMember, VoiceBasedChannel } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import { channelToTemplateSafeChannel, memberToTemplateSafeMember } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogVoiceChannelJoinData {
  member: GuildMember;
  channel: VoiceBasedChannel;
}

export function logVoiceChannelJoin(pluginData: GuildPluginData<LogsPluginType>, data: LogVoiceChannelJoinData) {
  return log(
    pluginData,
    LogType.VOICE_CHANNEL_JOIN,
    createTypedTemplateSafeValueContainer({
      member: memberToTemplateSafeMember(data.member),
      channel: channelToTemplateSafeChannel(data.channel),
    }),
    {
      userId: data.member.id,
      roles: Array.from(data.member.roles.cache.keys()),
      ...resolveChannelIds(data.channel),
      bot: data.member.user.bot,
    },
  );
}
