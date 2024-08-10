import { ZeppelinPluginDocs } from "../../types.js";
import { zGuildMemberCacheConfig } from "./types.js";

export const guildMemberCachePluginDocs: ZeppelinPluginDocs = {
  prettyName: "Guild member cache",
  type: "internal",
  configSchema: zGuildMemberCacheConfig,
};
