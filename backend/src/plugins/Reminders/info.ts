import { ZeppelinPluginInfo } from "../../types";
import { zRemindersConfig } from "./types";

export const remindersPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Reminders",
  configSchema: zRemindersConfig,
  showInDocs: true,
};
