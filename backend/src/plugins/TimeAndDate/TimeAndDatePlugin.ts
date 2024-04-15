import { PluginOptions, guildPlugin } from "knub";
import { GuildMemberTimezones } from "../../data/GuildMemberTimezones";
import { makePublicFn } from "../../pluginUtils";
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
import { CommonPlugin } from "../Common/CommonPlugin";

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

export const TimeAndDatePlugin = guildPlugin<TimeAndDatePluginType>()({
  name: "time_and_date",

  configParser: (input) => zTimeAndDateConfig.parse(input),
  defaultOptions,

  // prettier-ignore
  messageCommands: [
    ResetTimezoneCmd,
    SetTimezoneCmd,
    ViewTimezoneCmd,
  ],

  public(pluginData) {
    return {
      getGuildTz: makePublicFn(pluginData, getGuildTz),
      inGuildTz: makePublicFn(pluginData, inGuildTz),
      getMemberTz: makePublicFn(pluginData, getMemberTz),
      inMemberTz: makePublicFn(pluginData, inMemberTz),
      getDateFormat: makePublicFn(pluginData, getDateFormat),
    };
  },

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.memberTimezones = GuildMemberTimezones.getGuildInstance(guild.id);
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },
});
