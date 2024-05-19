import { ZeppelinPluginInfo } from "../../types.js";
import { zUsernameSaverConfig } from "./types.js";

export const usernameSaverPluginInfo: ZeppelinPluginInfo = {
  showInDocs: false,
  prettyName: "Username saver",
  configSchema: zUsernameSaverConfig,
};
