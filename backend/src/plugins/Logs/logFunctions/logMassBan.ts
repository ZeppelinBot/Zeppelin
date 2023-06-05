import { User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogMassBanData {
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
