import { ZeppelinPluginInfo } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zTimeAndDateConfig } from "./types.js";

export const timeAndDatePluginInfo: ZeppelinPluginInfo = {
  type: "stable",
  prettyName: "Time and date",
  description: trimPluginDescription(`
    Allows controlling the displayed time/date formats and timezones
  `),
  configSchema: zTimeAndDateConfig,
};
