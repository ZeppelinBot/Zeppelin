import { ZeppelinPluginDocs } from "../../types.js";
import { zWelcomeMessageConfig } from "./types.js";

export const welcomeMessagePluginDocs: ZeppelinPluginDocs = {
  type: "stable",
  prettyName: "Welcome message",
  configSchema: zWelcomeMessageConfig,
};
