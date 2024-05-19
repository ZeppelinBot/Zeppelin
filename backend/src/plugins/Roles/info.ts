import { ZeppelinPluginInfo } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zRolesConfig } from "./types.js";

export const rolesPluginInfo: ZeppelinPluginInfo = {
  type: "stable",
  prettyName: "Roles",
  description: trimPluginDescription(`
    Enables authorised users to add and remove whitelisted roles with a command.
  `),
  configSchema: zRolesConfig,
};
