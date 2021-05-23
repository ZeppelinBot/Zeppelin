import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, TimeAndDatePluginType } from "./types";
import { GuildMemberTimezones } from "../../data/GuildMemberTimezones";
import { PluginOptions } from "knub";
import { SetTimezoneCmd } from "./commands/SetTimezoneCmd";
import { ViewTimezoneCmd } from "./commands/ViewTimezoneCmd";
import { defaultDateFormats } from "./defaultDateFormats";
import { Tail } from "../../utils/typeUtils";
import { inGuildTz } from "./functions/inGuildTz";
import { mapToPublicFn } from "../../pluginUtils";
import { getGuildTz } from "./functions/getGuildTz";
import { getMemberTz } from "./functions/getMemberTz";
import { getDateFormat } from "./functions/getDateFormat";
import { inMemberTz } from "./functions/inMemberTz";
import { ResetTimezoneCmd } from "./commands/ResetTimezoneCmd";
import { trimPluginDescription } from "../../utils";

const defaultOptions: PluginOptions<TimeAndDatePluginType> = {
  config: {
    timezone: "Etc/UTC",
    can_set_timezone: false,
    date_formats: defaultDateFormats,
  },

  overrides: [
    {
      level: ">=50",
      config: {
        can_set_timezone: true,
      },
    },
  ],
};

export const TimeAndDatePlugin = zeppelinGuildPlugin<TimeAndDatePluginType>()({
  name: "time_and_date",
  showInDocs: true,
  info: {
    prettyName: "Time and date",
    description: trimPluginDescription(`
      Allows controlling the displayed time/date formats and timezones
    `),
  },

  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  commands: [
    ResetTimezoneCmd,
    SetTimezoneCmd,
    ViewTimezoneCmd,
  ],

  public: {
    getGuildTz: mapToPublicFn(getGuildTz),
    inGuildTz: mapToPublicFn(inGuildTz),
    getMemberTz: mapToPublicFn(getMemberTz),
    inMemberTz: mapToPublicFn(inMemberTz),
    getDateFormat: mapToPublicFn(getDateFormat),
  },

  beforeLoad(pluginData) {
    pluginData.state.memberTimezones = GuildMemberTimezones.getGuildInstance(pluginData.guild.id);
  },
});
