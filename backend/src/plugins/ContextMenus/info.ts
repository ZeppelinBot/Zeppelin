import { ZeppelinPluginInfo } from "../../types.js";
import { zContextMenusConfig } from "./types.js";

export const contextMenuPluginInfo: ZeppelinPluginInfo = {
  showInDocs: false,
  prettyName: "Context menu",
  configSchema: zContextMenusConfig,
};
