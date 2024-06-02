import { ZeppelinPluginInfo } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zCompanionChannelsConfig } from "./types.js";

export const companionChannelsPluginInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  prettyName: "Companion channels",
  configSchema: zCompanionChannelsConfig,
  description: trimPluginDescription(`
    Set up 'companion channels' between text and voice channels.
    Once set up, any time a user joins one of the specified voice channels,
    they'll get channel permissions applied to them for the text channels.
  `),
};
