import { ZeppelinPluginInfo } from "../../types";
import { trimPluginDescription } from "../../utils";
import { zModActionsConfig } from "./types";

export const modActionsPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Mod actions",
  showInDocs: true,
  description: trimPluginDescription(`
    This plugin contains the 'typical' mod actions such as warning, muting, kicking, banning, etc.
  `),
  configSchema: zModActionsConfig,
};
