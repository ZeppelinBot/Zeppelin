import { guildPlugin } from "vety";
import { PhishermanPluginType, zPhishermanConfig } from "./types.js";

export const PhishermanPlugin = guildPlugin<PhishermanPluginType>()({
  name: "phisherman",
  configSchema: zPhishermanConfig,
});
