import { ZeppelinPluginInfo } from "../../types.js";
import { zUsernameSaverConfig } from "./types.js";

export const usernameSaverPluginInfo: ZeppelinPluginInfo = {
  type: "internal",
  prettyName: "Username saver",
  configSchema: zUsernameSaverConfig,
};
