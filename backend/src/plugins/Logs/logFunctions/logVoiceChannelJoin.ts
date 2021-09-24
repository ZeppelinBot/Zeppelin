import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { BaseGuildVoiceChannel, GuildMember } from "discord.js";
import { channelToTemplateSafeChannel, memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";

interface LogVoiceChannelJoinData {
  member: GuildMember;
  channel: BaseGuildVoiceChannel;
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
      channel: data.channel.id,
      category: data.channel.parentId,
      bot: data.member.user.bot,
    },
  );
}
