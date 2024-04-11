import { ZeppelinPluginInfo } from "../../types";
import { zCountersConfig } from "./types";

export const countersPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Counters",
  showInDocs: true,
  description:
    "Keep track of per-user, per-channel, or global numbers and trigger specific actions based on this number",
  configurationGuide: "See <a href='/docs/setup-guides/counters'>Counters setup guide</a>",
  configSchema: zCountersConfig,
};
