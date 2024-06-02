import { ZeppelinPluginInfo } from "../../types.js";
import { zUtilityConfig } from "./types.js";

export const utilityPluginInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  prettyName: "Utility",
  configSchema: zUtilityConfig,
};
