import { ZeppelinPluginInfo } from "../../types";
import { trimPluginDescription } from "../../utils";
import { zCasesConfig } from "./types";

export const casesPluginInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  prettyName: "Cases",
  description: trimPluginDescription(`
    This plugin contains basic configuration for cases created by other plugins
  `),
  configSchema: zCasesConfig,
};
