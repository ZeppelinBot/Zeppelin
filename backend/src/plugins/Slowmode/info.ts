import { ZeppelinPluginInfo } from "../../types.js";
import { zSlowmodeConfig } from "./types.js";

export const slowmodePluginInfo: ZeppelinPluginInfo = {
  type: "stable",
  prettyName: "Slowmode",
  configSchema: zSlowmodeConfig,
};
