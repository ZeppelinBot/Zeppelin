import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogBotAlertData {
  body: string;
}

export function logBotAlert(pluginData: GuildPluginData<LogsPluginType>, data: LogBotAlertData) {
  return log(
    pluginData,
    LogType.BOT_ALERT,
    createTypedTemplateSafeValueContainer({
      body: data.body,
    }),
    {},
  );
}
