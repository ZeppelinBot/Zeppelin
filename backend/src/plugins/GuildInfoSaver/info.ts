import { ZeppelinPluginInfo } from "../../types.js";
import { zGuildInfoSaverConfig } from "./types.js";

export const guildInfoSaverPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Guild info saver",
  type: "internal",
  configSchema: zGuildInfoSaverConfig,
};
