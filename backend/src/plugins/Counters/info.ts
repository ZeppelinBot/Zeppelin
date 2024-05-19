import { ZeppelinPluginInfo } from "../../types.js";
import { zCountersConfig } from "./types.js";

export const countersPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Counters",
  type: "stable",
  description:
    "Keep track of per-user, per-channel, or global numbers and trigger specific actions based on this number",
  configurationGuide: "See <a href='/docs/setup-guides/counters'>Counters setup guide</a>",
  configSchema: zCountersConfig,
};
