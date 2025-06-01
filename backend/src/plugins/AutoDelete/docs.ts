import { ZeppelinPluginDocs } from "../../types.js";
import { zAutoDeleteConfig } from "./types.js";

export const autoDeletePluginDocs: ZeppelinPluginDocs = {
  type: "stable",
  configSchema: zAutoDeleteConfig,

  prettyName: "Auto-delete",
  description: "Allows Zeppelin to auto-delete messages from a channel after a delay",
  configurationGuide: "Maximum deletion delay is currently 5 minutes",
};
