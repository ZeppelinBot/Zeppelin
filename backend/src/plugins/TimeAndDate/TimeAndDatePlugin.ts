import { PluginOptions } from "knub";
import { GuildMemberTimezones } from "../../data/GuildMemberTimezones";
import { mapToPublicFn } from "../../pluginUtils";
import { trimPluginDescription } from "../../utils";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ResetTimezoneCmd } from "./commands/ResetTimezoneCmd";
import { SetTimezoneCmd } from "./commands/SetTimezoneCmd";
import { ViewTimezoneCmd } from "./commands/ViewTimezoneCmd";
import { defaultDateFormats } from "./defaultDateFormats";
import { getDateFormat } from "./functions/getDateFormat";
import { getGuildTz } from "./functions/getGuildTz";
import { getMemberTz } from "./functions/getMemberTz";
import { inGuildTz } from "./functions/inGuildTz";
import { inMemberTz } from "./functions/inMemberTz";
import { TimeAndDatePluginType, zTimeAndDateConfig } from "./types";

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
    configSchema: zTimeAndDateConfig,
  },

  configParser: (input) => zTimeAndDateConfig.parse(input),
  defaultOptions,

  // prettier-ignore
  messageCommands: [
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
    const { state, guild } = pluginData;

    state.memberTimezones = GuildMemberTimezones.getGuildInstance(guild.id);
  },
});
