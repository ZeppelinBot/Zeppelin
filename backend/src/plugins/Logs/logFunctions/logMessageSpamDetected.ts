import { GuildMember, GuildTextBasedChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel, memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogMessageSpamDetectedData {
  member: GuildMember;
  channel: GuildTextBasedChannel;
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
