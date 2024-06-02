import { ZeppelinPluginInfo } from "../../types.js";
import { zMutesConfig } from "./types.js";

export const mutesPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Mutes",
  showInDocs: true,
  configSchema: zMutesConfig,
};
