import { ZeppelinPluginInfo } from "../../types";
import { zNameHistoryConfig } from "./types";

export const nameHistoryPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Name history",
  showInDocs: false,
  configSchema: zNameHistoryConfig,
};
