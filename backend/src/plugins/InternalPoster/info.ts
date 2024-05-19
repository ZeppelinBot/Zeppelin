import { ZeppelinPluginInfo } from "../../types.js";
import { zInternalPosterConfig } from "./types.js";

export const internalPosterPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Internal poster",
  type: "internal",
  configSchema: zInternalPosterConfig,
};
