import { ZeppelinPluginDocs } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zBotControlConfig } from "./types.js";

export const botControlPluginDocs: ZeppelinPluginDocs = {
  type: "stable",
  configSchema: zBotControlConfig,

  prettyName: "Bot control",
  description: trimPluginDescription(`
    Contains commands to manage allowed servers
  `),
};
