import { ZeppelinPluginInfo } from "../../types.js";

export const autoDeletePluginInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  prettyName: "Auto-delete",
  description: "Allows Zeppelin to auto-delete messages from a channel after a delay",
  configurationGuide: "Maximum deletion delay is currently 5 minutes",
};
