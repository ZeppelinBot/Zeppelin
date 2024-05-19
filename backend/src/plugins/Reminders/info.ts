import { ZeppelinPluginInfo } from "../../types.js";
import { zRemindersConfig } from "./types.js";

export const remindersPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Reminders",
  configSchema: zRemindersConfig,
  type: "stable",
};
