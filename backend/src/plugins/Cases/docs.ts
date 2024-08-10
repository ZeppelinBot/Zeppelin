import { ZeppelinPluginDocs } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zCasesConfig } from "./types.js";

export const casesPluginDocs: ZeppelinPluginDocs = {
  type: "stable",
  configSchema: zCasesConfig,

  prettyName: "Cases",
  description: trimPluginDescription(`
    This plugin contains basic configuration for cases created by other plugins
  `),
};
