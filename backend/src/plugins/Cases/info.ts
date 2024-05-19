import { ZeppelinPluginInfo } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zCasesConfig } from "./types.js";

export const casesPluginInfo: ZeppelinPluginInfo = {
  type: "stable",
  prettyName: "Cases",
  configSchema: zCasesConfig,
  description: trimPluginDescription(`
    This plugin contains basic configuration for cases created by other plugins
  `),
};
