import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildMember } from "discord.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";

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
