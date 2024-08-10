import { ZeppelinPluginDocs } from "../../types.js";
import { zGuildConfigReloaderPlugin } from "./types.js";

export const guildConfigReloaderPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Guild config reloader",
  type: "internal",
  configSchema: zGuildConfigReloaderPlugin,
};
