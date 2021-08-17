import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { User } from "discord.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";

interface LogMassUnbanData {
  mod: User;
  count: number;
  reason: string;
}

export function logMassUnban(pluginData: GuildPluginData<LogsPluginType>, data: LogMassUnbanData) {
  return log(
    pluginData,
    LogType.MASSUNBAN,
    createTypedTemplateSafeValueContainer({
      mod: userToTemplateSafeUser(data.mod),
      count: data.count,
      reason: data.reason,
    }),
    {},
  );
}
