import { ZeppelinPluginInfo } from "../../types";
import { trimPluginDescription } from "../../utils";

export const censorPluginInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  legacy: true,
  prettyName: "Censor",
  description: trimPluginDescription(`
    Censor words, tokens, links, regex, etc.
    For more advanced filtering, check out the Automod plugin!
  `),
};
