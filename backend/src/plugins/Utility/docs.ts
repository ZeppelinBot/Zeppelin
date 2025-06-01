import { ZeppelinPluginDocs } from "../../types.js";
import { zUtilityConfig } from "./types.js";

export const utilityPluginDocs: ZeppelinPluginDocs = {
  type: "stable",
  prettyName: "Utility",
  configSchema: zUtilityConfig,
};
