import { Snowflake, User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { UnknownUser } from "../../../utils";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
