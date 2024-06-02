import { ZeppelinPluginInfo } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zAutoReactionsConfig } from "./types.js";

export const autoReactionsInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  prettyName: "Auto-reactions",
  description: trimPluginDescription(`
    Allows setting up automatic reactions to all new messages on a channel
  `),
  configSchema: zAutoReactionsConfig,
};
