import { ZeppelinPluginInfo } from "../../types.js";
import { zMessageSaverConfig } from "./types.js";

export const messageSaverPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Message saver",
  type: "internal",
  configSchema: zMessageSaverConfig,
};
