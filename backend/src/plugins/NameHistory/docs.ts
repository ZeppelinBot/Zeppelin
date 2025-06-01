import { ZeppelinPluginDocs } from "../../types.js";
import { zNameHistoryConfig } from "./types.js";

export const nameHistoryPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Name history",
  type: "internal",
  configSchema: zNameHistoryConfig,
};
