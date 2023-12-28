import { User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
