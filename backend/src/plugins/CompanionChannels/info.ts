import { ZeppelinPluginInfo } from "../../types";
import { trimPluginDescription } from "../../utils";
import { zCompanionChannelsConfig } from "./types";

export const companionChannelsPluginInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  prettyName: "Companion channels",
  description: trimPluginDescription(`
    Set up 'companion channels' between text and voice channels.
    Once set up, any time a user joins one of the specified voice channels,
    they'll get channel permissions applied to them for the text channels.
  `),
  configSchema: zCompanionChannelsConfig,
};
