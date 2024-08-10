import { ZeppelinPluginDocs } from "../../types.js";
import { zGuildInfoSaverConfig } from "./types.js";

export const guildInfoSaverPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Guild info saver",
  type: "internal",
  configSchema: zGuildInfoSaverConfig,
};
