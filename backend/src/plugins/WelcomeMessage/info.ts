import { ZeppelinPluginInfo } from "../../types";
import { zWelcomeMessageConfig } from "./types";

export const welcomeMessagePluginInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  prettyName: "Welcome message",
  configSchema: zWelcomeMessageConfig,
};
