import { ZeppelinPluginInfo } from "../../types.js";
import { zGuildMemberCacheConfig } from "./types.js";

export const guildMemberCachePluginInfo: ZeppelinPluginInfo = {
  prettyName: "Guild member cache",
  showInDocs: false,
  configSchema: zGuildMemberCacheConfig,
};
