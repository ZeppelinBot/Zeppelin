import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";

interface LogSetAntiraidAutoData {
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
