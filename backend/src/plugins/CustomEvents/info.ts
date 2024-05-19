import { ZeppelinPluginInfo } from "../../types.js";
import { zCustomEventsConfig } from "./types.js";

export const customEventsPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Custom events",
  type: "internal",
  configSchema: zCustomEventsConfig,
};
