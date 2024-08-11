import { ZeppelinPluginDocs } from "../../types.js";
import { zCommonConfig } from "./types.js";

export const commonPluginDocs: ZeppelinPluginDocs = {
  type: "internal",
  configSchema: zCommonConfig,

  prettyName: "Common",
};
