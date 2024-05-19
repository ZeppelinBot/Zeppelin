import { ZeppelinPluginInfo } from "../../types.js";
import { zAutoDeleteConfig } from "./types.js";

export const autoDeletePluginInfo: ZeppelinPluginInfo = {
  type: "stable",
  prettyName: "Auto-delete",
  description: "Allows Zeppelin to auto-delete messages from a channel after a delay",
  configurationGuide: "Maximum deletion delay is currently 5 minutes",
  configSchema: zAutoDeleteConfig,
};
