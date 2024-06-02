import { ZeppelinPluginInfo } from "../../types.js";
import { zPostConfig } from "./types.js";

export const postPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Post",
  configSchema: zPostConfig,
  showInDocs: true,
};
