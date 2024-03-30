import { ZeppelinPluginInfo } from "../../types";
import { trimPluginDescription } from "../../utils";
import { zTimeAndDateConfig } from "./types";

export const timeAndDatePluginInfo: ZeppelinPluginInfo = {
  showInDocs: true,
  prettyName: "Time and date",
  description: trimPluginDescription(`
    Allows controlling the displayed time/date formats and timezones
  `),
  configSchema: zTimeAndDateConfig,
};
