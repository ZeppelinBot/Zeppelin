import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogSetAntiraidAutoData {
  level: string;
}

export function logSetAntiraidAuto(pluginData: GuildPluginData<LogsPluginType>, data: LogSetAntiraidAutoData) {
  return log(
    pluginData,
    LogType.SET_ANTIRAID_AUTO,
    createTypedTemplateSafeValueContainer({
      level: data.level,
    }),
    {},
  );
}
