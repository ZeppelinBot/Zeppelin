import { ZeppelinPluginDocs } from "../../types.js";
import { zCustomEventsConfig } from "./types.js";

export const customEventsPluginDocs: ZeppelinPluginDocs = {
  prettyName: "Custom events",
  type: "internal",
  configSchema: zCustomEventsConfig,
};
