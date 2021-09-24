import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";

interface LogBotAlertData {
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
