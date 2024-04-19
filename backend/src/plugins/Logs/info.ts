import { ZeppelinPluginInfo } from "../../types";
import { zLogsConfig } from "./types";

export const logsPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Logs",
  configSchema: zLogsConfig,
  showInDocs: true,
};
