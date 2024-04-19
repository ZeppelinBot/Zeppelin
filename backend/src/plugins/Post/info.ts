import { ZeppelinPluginInfo } from "../../types";
import { zPostConfig } from "./types";

export const postPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Post",
  configSchema: zPostConfig,
  showInDocs: true,
};
