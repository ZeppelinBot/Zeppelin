import { ZeppelinPluginDocs } from "../../types.js";
import { zRemindersConfig } from "./types.js";

export const remindersPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Reminders",
  configSchema: zRemindersConfig,
  type: "stable",
};
