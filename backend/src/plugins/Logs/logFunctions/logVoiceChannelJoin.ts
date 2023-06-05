import { GuildMember, VoiceBasedChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel, memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogVoiceChannelJoinData {
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
