import { ZeppelinPluginDocs } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zCensorConfig } from "./types.js";

export const censorPluginDocs: ZeppelinPluginDocs = {
  type: "legacy",
  configSchema: zCensorConfig,

  prettyName: "Censor",
  description: trimPluginDescription(`
    Censor words, tokens, links, regex, etc.
    For more advanced filtering, check out the Automod plugin!
  `),
};
