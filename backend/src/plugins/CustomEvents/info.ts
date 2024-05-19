import { ZeppelinPluginInfo } from "../../types.js";
import { zCustomEventsConfig } from "./types.js";

export const customEventsPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Custom events",
  showInDocs: false,
  configSchema: zCustomEventsConfig,
};
