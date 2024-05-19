import { ZeppelinPluginInfo } from "../../types.js";
import { zPingableRolesConfig } from "./types.js";

export const pingableRolesPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Pingable roles",
  configSchema: zPingableRolesConfig,
  type: "stable",
};
