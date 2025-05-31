import { ZeppelinPluginDocs } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zPhishermanConfig } from "./types.js";

export const phishermanPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Phisherman",
  type: "legacy",
  description: trimPluginDescription(`
    Match malicious links using Phisherman
  `),
  configurationGuide: trimPluginDescription(`
    This plugin has been deprecated. Please use the \`include_malicious\` option for automod \`match_links\` trigger instead.
  `),
  configSchema: zPhishermanConfig,
};
