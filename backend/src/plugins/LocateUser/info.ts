import { ZeppelinPluginInfo } from "../../types";
import { trimPluginDescription } from "../../utils";
import { zLocateUserConfig } from "./types";

export const locateUserPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Locate user",
  description: trimPluginDescription(`
    This plugin allows users with access to the commands the following:
    * Instantly receive an invite to the voice channel of a user
    * Be notified as soon as a user switches or joins a voice channel
  `),
  configSchema: zLocateUserConfig,
  showInDocs: true,
};
