import { ZeppelinPluginDocs } from "../../types.js";
import { zCountersConfig } from "./types.js";

export const countersPluginDocs: ZeppelinPluginDocs = {
  type: "stable",
  configSchema: zCountersConfig,

  prettyName: "Counters",
  description:
    "Keep track of per-user, per-channel, or global numbers and trigger specific actions based on this number",
  configurationGuide: "See <a href='/docs/setup-guides/counters'>Counters setup guide</a>",
};
