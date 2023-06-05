import { GuildMember, Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogMemberForcebanData {
  mod: GuildMember;
  userId: Snowflake;
  caseNumber: number;
  reason: string;
}

export function logMemberForceban(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberForcebanData) {
  return log(
    pluginData,
    LogType.MEMBER_FORCEBAN,
    createTypedTemplateSafeValueContainer({
      mod: memberToTemplateSafeMember(data.mod),
      userId: data.userId,
      caseNumber: data.caseNumber,
      reason: data.reason,
    }),
    {
      userId: data.userId,
    },
  );
}
