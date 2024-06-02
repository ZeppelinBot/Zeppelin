import { ZeppelinPluginInfo } from "../../types.js";
import { zNameHistoryConfig } from "./types.js";

export const nameHistoryPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Name history",
  showInDocs: false,
  configSchema: zNameHistoryConfig,
};
