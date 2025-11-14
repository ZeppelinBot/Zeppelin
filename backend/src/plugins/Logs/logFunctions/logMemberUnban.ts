import { PartialUser, Snowflake, User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { UnknownUser } from "../../../utils.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMemberUnbanData {
  mod: User | UnknownUser | PartialUser | null;
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
