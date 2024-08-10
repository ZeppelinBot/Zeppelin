import { ZeppelinPluginDocs } from "../../types.js";
import { zRoleManagerConfig } from "./types.js";

export const roleManagerPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Role manager",
  type: "internal",
  configSchema: zRoleManagerConfig,
};
