import { ZeppelinPluginDocs } from "../../types.js";
import { zMessageSaverConfig } from "./types.js";

export const messageSaverPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Message saver",
  type: "internal",
  configSchema: zMessageSaverConfig,
};
