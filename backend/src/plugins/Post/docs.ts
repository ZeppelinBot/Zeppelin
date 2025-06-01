import { ZeppelinPluginDocs } from "../../types.js";
import { zPostConfig } from "./types.js";

export const postPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Post",
  configSchema: zPostConfig,
  type: "stable",
};
