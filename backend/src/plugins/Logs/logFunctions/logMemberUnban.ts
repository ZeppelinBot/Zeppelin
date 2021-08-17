import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildMember, Snowflake, User } from "discord.js";
import { memberToTemplateSafeMember, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { UnknownUser } from "../../../utils";

interface LogMemberUnbanData {
  mod: User | UnknownUser | null;
  userId: Snowflake;
  caseNumber: number;
  reason: string;
}

export function logMemberUnban(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberUnbanData) {
  return log(
    pluginData,
    LogType.MEMBER_UNBAN,
    createTypedTemplateSafeValueContainer({
      mod: data.mod ? userToTemplateSafeUser(data.mod) : null,
      userId: data.userId,
      caseNumber: data.caseNumber,
      reason: data.reason,
    }),
    {
      userId: data.userId,
    },
  );
}
