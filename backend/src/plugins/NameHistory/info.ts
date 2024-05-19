import { ZeppelinPluginInfo } from "../../types.js";
import { zNameHistoryConfig } from "./types.js";

export const nameHistoryPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Name history",
  type: "internal",
  configSchema: zNameHistoryConfig,
};
