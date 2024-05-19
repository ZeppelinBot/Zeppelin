import { ZeppelinPluginInfo } from "../../types.js";
import { zContextMenusConfig } from "./types.js";

export const contextMenuPluginInfo: ZeppelinPluginInfo = {
  type: "stable",
  prettyName: "Context menu",
  configSchema: zContextMenusConfig,
};
