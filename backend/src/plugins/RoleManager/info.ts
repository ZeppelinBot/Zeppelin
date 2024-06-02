import { ZeppelinPluginInfo } from "../../types.js";
import { zRoleManagerConfig } from "./types.js";

export const roleManagerPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Role manager",
  showInDocs: false,
  configSchema: zRoleManagerConfig,
};
