import { ZeppelinPluginInfo } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zCensorConfig } from "./types.js";

export const censorPluginInfo: ZeppelinPluginInfo = {
  type: "legacy",
  prettyName: "Censor",
  configSchema: zCensorConfig,
  description: trimPluginDescription(`
    Censor words, tokens, links, regex, etc.
    For more advanced filtering, check out the Automod plugin!
  `),
};
