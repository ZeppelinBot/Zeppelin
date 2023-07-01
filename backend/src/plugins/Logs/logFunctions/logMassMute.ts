import { User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogMassMuteData {
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
