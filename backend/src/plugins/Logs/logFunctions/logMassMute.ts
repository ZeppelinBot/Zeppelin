import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { User } from "discord.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";

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
