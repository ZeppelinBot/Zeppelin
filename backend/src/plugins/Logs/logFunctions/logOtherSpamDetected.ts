import { GuildMember } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogOtherSpamDetectedData {
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
