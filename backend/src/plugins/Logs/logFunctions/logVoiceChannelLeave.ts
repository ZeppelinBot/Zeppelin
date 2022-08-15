import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { BaseGuildVoiceChannel, GuildMember } from "discord.js";
import { channelToTemplateSafeChannel, memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";

interface LogVoiceChannelLeaveData {
  member: GuildMember;
  channel: BaseGuildVoiceChannel;
}

export function logVoiceChannelLeave(pluginData: GuildPluginData<LogsPluginType>, data: LogVoiceChannelLeaveData) {
  return log(
    pluginData,
    LogType.VOICE_CHANNEL_LEAVE,
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
