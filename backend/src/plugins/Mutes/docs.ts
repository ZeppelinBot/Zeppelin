import { ZeppelinPluginDocs } from "../../types.js";
import { zMutesConfig } from "./types.js";

export const mutesPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Mutes",
  type: "stable",
  configSchema: zMutesConfig,
};
