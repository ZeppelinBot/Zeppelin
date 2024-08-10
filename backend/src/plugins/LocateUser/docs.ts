import { ZeppelinPluginDocs } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zLocateUserConfig } from "./types.js";

export const locateUserPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Locate user",
  type: "stable",
  description: trimPluginDescription(`
    This plugin allows users with access to the commands the following:
    * Instantly receive an invite to the voice channel of a user
    * Be notified as soon as a user switches or joins a voice channel
  `),
  configSchema: zLocateUserConfig,
};
