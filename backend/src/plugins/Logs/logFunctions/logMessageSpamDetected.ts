import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { BaseGuildTextChannel, GuildChannel, GuildMember, ThreadChannel } from "discord.js";
import { channelToTemplateSafeChannel, memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";

interface LogMessageSpamDetectedData {
  member: GuildMember;
  channel: GuildChannel | ThreadChannel;
  description: string;
  limit: number;
  interval: number;
  archiveUrl: string;
}

export function logMessageSpamDetected(pluginData: GuildPluginData<LogsPluginType>, data: LogMessageSpamDetectedData) {
  return log(
    pluginData,
    LogType.MESSAGE_SPAM_DETECTED,
    createTypedTemplateSafeValueContainer({
      member: memberToTemplateSafeMember(data.member),
      channel: channelToTemplateSafeChannel(data.channel),
      description: data.description,
      limit: data.limit,
      interval: data.interval,
      archiveUrl: data.archiveUrl,
    }),
    {
      userId: data.member.id,
      roles: Array.from(data.member.roles.cache.keys()),
      bot: data.member.user.bot,
      ...resolveChannelIds(data.channel),
    },
  );
}
