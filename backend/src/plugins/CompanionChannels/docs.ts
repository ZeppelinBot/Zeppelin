import { ZeppelinPluginDocs } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zCompanionChannelsConfig } from "./types.js";

export const companionChannelsPluginDocs: ZeppelinPluginDocs = {
  type: "stable",
  configSchema: zCompanionChannelsConfig,

  prettyName: "Companion channels",
  description: trimPluginDescription(`
    Set up 'companion channels' between text and voice channels.
    Once set up, any time a user joins one of the specified voice channels,
    they'll get channel permissions applied to them for the text channels.
  `),
};
