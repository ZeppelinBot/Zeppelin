import { GuildMember, VoiceBasedChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel, memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogVoiceChannelLeaveData {
  member: GuildMember;
  channel: VoiceBasedChannel;
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
