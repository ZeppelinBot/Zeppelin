import { ZeppelinPluginInfo } from "../../types.js";
import { zWelcomeMessageConfig } from "./types.js";

export const welcomeMessagePluginInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  prettyName: "Welcome message",
  configSchema: zWelcomeMessageConfig,
};
