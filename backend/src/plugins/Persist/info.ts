import { ZeppelinPluginInfo } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zPersistConfig } from "./types.js";

export const persistPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Persist",
  description: trimPluginDescription(`
    Re-apply roles or nicknames for users when they rejoin the server.
    Mute roles are re-applied automatically, this plugin is not required for that.
  `),
  configSchema: zPersistConfig,
  showInDocs: true,
};
