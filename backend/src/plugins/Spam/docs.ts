import { ZeppelinPluginDocs } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zSpamConfig } from "./types.js";

export const spamPluginDocs: ZeppelinPluginDocs = {
  type: "legacy",
  prettyName: "Spam protection",
  description: trimPluginDescription(`
    Basic spam detection and auto-muting.
    For more advanced spam filtering, check out the Automod plugin!
  `),
  configSchema: zSpamConfig,
};
