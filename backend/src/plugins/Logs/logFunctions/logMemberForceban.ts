import { GuildMember, Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { memberToTemplateSafeMember } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMemberForcebanData {
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
