import { ZeppelinPluginInfo } from "../../types";
import { trimPluginDescription } from "../../utils";
import { zSpamConfig } from "./types";

export const spamPluginInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  prettyName: "Spam protection",
  description: trimPluginDescription(`
    Basic spam detection and auto-muting.
    For more advanced spam filtering, check out the Automod plugin!
  `),
  legacy: true,
  configSchema: zSpamConfig,
};
