import { User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { UnknownUser } from "../../../utils.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMemberKickData {
  mod: User | UnknownUser | null;
  user: User;
  caseNumber: number;
  reason: string;
}

export function logMemberKick(pluginData: GuildPluginData<LogsPluginType>, data: LogMemberKickData) {
  return log(
    pluginData,
    LogType.MEMBER_KICK,
    createTypedTemplateSafeValueContainer({
      mod: data.mod ? userToTemplateSafeUser(data.mod) : null,
      user: userToTemplateSafeUser(data.user),
      caseNumber: data.caseNumber,
      reason: data.reason,
    }),
    {
      userId: data.user.id,
      bot: data.user.bot,
    },
  );
}
