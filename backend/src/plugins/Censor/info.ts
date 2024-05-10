import { ZeppelinPluginInfo } from "../../types";
import { trimPluginDescription } from "../../utils";
import { zCensorConfig } from "./types";

export const censorPluginInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  legacy: true,
  prettyName: "Censor",
  description: trimPluginDescription(`
    Censor words, tokens, links, regex, etc.
    For more advanced filtering, check out the Automod plugin!
  `),
  configSchema: zCensorConfig,
};
