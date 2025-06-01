import { ZeppelinPluginDocs } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zTimeAndDateConfig } from "./types.js";

export const timeAndDatePluginDocs: ZeppelinPluginDocs = {
  type: "stable",
  prettyName: "Time and date",
  description: trimPluginDescription(`
    Allows controlling the displayed time/date formats and timezones
  `),
  configSchema: zTimeAndDateConfig,
};
