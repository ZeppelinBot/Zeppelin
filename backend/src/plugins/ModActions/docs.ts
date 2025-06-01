import { ZeppelinPluginDocs } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zModActionsConfig } from "./types.js";

export const modActionsPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Mod actions",
  type: "stable",
  description: trimPluginDescription(`
    This plugin contains the 'typical' mod actions such as warning, muting, kicking, banning, etc.
  `),
  configSchema: zModActionsConfig,
};
