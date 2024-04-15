import { ZeppelinPluginInfo } from "../../types";
import { trimPluginDescription } from "../../utils";
import { zContextMenusConfig } from "./types";

export const contextMenuPluginInfo: ZeppelinPluginInfo = {
  showInDocs: false,
  prettyName: "Context menu",
  description: trimPluginDescription(`
      This plugin provides command shortcuts via context menus
    `),
  configSchema: zContextMenusConfig,
};
