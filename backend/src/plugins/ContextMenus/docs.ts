import { ZeppelinPluginDocs } from "../../types.js";
import { zContextMenusConfig } from "./types.js";

export const contextMenuPluginDocs: ZeppelinPluginDocs = {
  type: "stable",
  configSchema: zContextMenusConfig,

  prettyName: "Context menu",
};
