import { ZeppelinPluginDocs } from "../../types.js";
import { zLogsConfig } from "./types.js";

export const logsPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Logs",
  configSchema: zLogsConfig,
  type: "stable",
};
