import { ZeppelinPluginInfo } from "../../types.js";
import { zLogsConfig } from "./types.js";

export const logsPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Logs",
  configSchema: zLogsConfig,
  type: "stable",
};
