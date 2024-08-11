import { ZeppelinPluginInfo } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zContextMenusConfig } from "./types.js";

export const contextMenuPluginInfo: ZeppelinPluginInfo = {
  showInDocs: false,
  prettyName: "Context menu",
  description: trimPluginDescription(`
      This plugin provides command shortcuts via context menus
    `),
  configSchema: zContextMenusConfig,
};
