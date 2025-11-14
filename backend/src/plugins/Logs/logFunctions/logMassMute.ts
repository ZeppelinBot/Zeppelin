import { User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMassMuteData {
  mod: User;
  count: number;
}

export function logMassMute(pluginData: GuildPluginData<LogsPluginType>, data: LogMassMuteData) {
  return log(
    pluginData,
    LogType.MASSMUTE,
    createTypedTemplateSafeValueContainer({
      mod: userToTemplateSafeUser(data.mod),
      count: data.count,
    }),
    {},
  );
}
