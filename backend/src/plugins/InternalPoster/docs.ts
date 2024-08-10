import { ZeppelinPluginDocs } from "../../types.js";
import { zInternalPosterConfig } from "./types.js";

export const internalPosterPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Internal poster",
  type: "internal",
  configSchema: zInternalPosterConfig,
};
