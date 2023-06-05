import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
