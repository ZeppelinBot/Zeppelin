import { ZeppelinPluginInfo } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zModActionsConfig } from "./types.js";

export const modActionsPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Mod actions",
  showInDocs: true,
  description: trimPluginDescription(`
    This plugin contains the 'typical' mod actions such as warning, muting, kicking, banning, etc.
  `),
  configSchema: zModActionsConfig,
};
