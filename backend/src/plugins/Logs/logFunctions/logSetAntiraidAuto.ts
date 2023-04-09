import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
