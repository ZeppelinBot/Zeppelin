import { ZeppelinPluginDocs } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zPersistConfig } from "./types.js";

export const persistPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Persist",
  description: trimPluginDescription(`
    Re-apply roles or nicknames for users when they rejoin the server.
    Mute roles are re-applied automatically, this plugin is not required for that.
  `),
  configSchema: zPersistConfig,
  type: "stable",
};
