import { ZeppelinPluginInfo } from "../../types";
import { zMutesConfig } from "./types";

export const mutesPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Mutes",
  showInDocs: true,
  configSchema: zMutesConfig,
};
