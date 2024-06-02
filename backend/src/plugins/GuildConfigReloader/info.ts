import { ZeppelinPluginInfo } from "../../types.js";
import { zGuildConfigReloaderPlugin } from "./types.js";

export const guildConfigReloaderPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Guild config reloader",
  showInDocs: false,
  configSchema: zGuildConfigReloaderPlugin,
};
