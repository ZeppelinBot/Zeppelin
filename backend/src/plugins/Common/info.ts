import { ZeppelinPluginInfo } from "../../types";
import { zCommonConfig } from "./types";

export const contextMenuPluginInfo: ZeppelinPluginInfo = {
  showInDocs: false,
  prettyName: "Common",
  configSchema: zCommonConfig,
};
