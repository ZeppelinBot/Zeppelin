import { GuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogOtherSpamDetectedData {
  member: GuildMember;
  description: string;
  limit: number;
  interval: number;
}

export function logOtherSpamDetected(pluginData: GuildPluginData<LogsPluginType>, data: LogOtherSpamDetectedData) {
  return log(
    pluginData,
    LogType.OTHER_SPAM_DETECTED,
    createTypedTemplateSafeValueContainer({
      member: memberToTemplateSafeMember(data.member),
      description: data.description,
      limit: data.limit,
      interval: data.interval,
    }),
    {
      userId: data.member.id,
      bot: data.member.user.bot,
    },
  );
}
