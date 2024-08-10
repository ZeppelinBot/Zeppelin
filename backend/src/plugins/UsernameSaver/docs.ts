import { ZeppelinPluginDocs } from "../../types.js";
import { zUsernameSaverConfig } from "./types.js";

export const usernameSaverPluginDocs: ZeppelinPluginDocs = {
  type: "internal",
  prettyName: "Username saver",
  configSchema: zUsernameSaverConfig,
};
