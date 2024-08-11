import { ZeppelinPluginInfo } from "../../types.js";
import { zCommonConfig } from "./types.js";

export const contextMenuPluginInfo: ZeppelinPluginInfo = {
  showInDocs: false,
  prettyName: "Common",
  configSchema: zCommonConfig,
};
