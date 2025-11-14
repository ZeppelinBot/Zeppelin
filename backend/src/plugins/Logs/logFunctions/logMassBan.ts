import { User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMassBanData {
  mod: User;
  count: number;
  reason: string;
}

export function logMassBan(pluginData: GuildPluginData<LogsPluginType>, data: LogMassBanData) {
  return log(
    pluginData,
    LogType.MASSBAN,
    createTypedTemplateSafeValueContainer({
      mod: userToTemplateSafeUser(data.mod),
      count: data.count,
      reason: data.reason,
    }),
    {},
  );
}
