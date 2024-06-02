import { ZeppelinPluginInfo } from "../../types.js";
import { zSlowmodeConfig } from "./types.js";

export const slowmodePluginInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  prettyName: "Slowmode",
  configSchema: zSlowmodeConfig,
};
