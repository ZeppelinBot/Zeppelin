import { ZeppelinPluginInfo } from "../../types";
import { zPingableRolesConfig } from "./types";

export const pingableRolesPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Pingable roles",
  configSchema: zPingableRolesConfig,
  showInDocs: true,
};
