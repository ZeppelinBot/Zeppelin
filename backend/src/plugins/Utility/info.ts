import { ZeppelinPluginInfo } from "../../types.js";
import { zUtilityConfig } from "./types.js";

export const utilityPluginInfo: ZeppelinPluginInfo = {
  type: "stable",
  prettyName: "Utility",
  configSchema: zUtilityConfig,
};
