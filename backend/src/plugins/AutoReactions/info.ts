import { ZeppelinPluginInfo } from "../../types";
import { trimPluginDescription } from "../../utils";
import { zAutoReactionsConfig } from "./types";

export const autoReactionsInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  prettyName: "Auto-reactions",
  description: trimPluginDescription(`
    Allows setting up automatic reactions to all new messages on a channel
  `),
  configSchema: zAutoReactionsConfig,
};
