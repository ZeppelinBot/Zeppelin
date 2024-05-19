import { ZeppelinPluginInfo } from "../../types.js";
import { zWelcomeMessageConfig } from "./types.js";

export const welcomeMessagePluginInfo: ZeppelinPluginInfo = {
  type: "stable",
  prettyName: "Welcome message",
  configSchema: zWelcomeMessageConfig,
};
