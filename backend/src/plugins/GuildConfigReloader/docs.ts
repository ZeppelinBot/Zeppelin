import { ZeppelinPluginDocs } from "../../types.js";
import { zGuildConfigReloaderPluginConfig } from "./types.js";

export const guildConfigReloaderPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Guild config reloader",
  type: "internal",
  configSchema: zGuildConfigReloaderPluginConfig,
};
