import { ZeppelinPluginInfo } from "../../types";
import { zSlowmodeConfig } from "./types";

export const slowmodePluginInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  prettyName: "Slowmode",
  configSchema: zSlowmodeConfig,
};
