import { ZeppelinPluginInfo } from "../../types";
import { trimPluginDescription } from "../../utils";
import { zRolesConfig } from "./types";

export const rolesPluginInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  prettyName: "Roles",
  description: trimPluginDescription(`
    Enables authorised users to add and remove whitelisted roles with a command.
  `),
  configSchema: zRolesConfig,
};
