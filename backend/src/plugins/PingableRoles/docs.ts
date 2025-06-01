import { ZeppelinPluginDocs } from "../../types.js";
import { zPingableRolesConfig } from "./types.js";

export const pingableRolesPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Pingable roles",
  configSchema: zPingableRolesConfig,
  type: "stable",
};
