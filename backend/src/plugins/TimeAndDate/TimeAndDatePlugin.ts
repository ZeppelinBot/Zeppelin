import { guildPlugin } from "vety";
import { GuildMemberTimezones } from "../../data/GuildMemberTimezones.js";
import { makePublicFn } from "../../pluginUtils.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { ResetTimezoneCmd } from "./commands/ResetTimezoneCmd.js";
import { SetTimezoneCmd } from "./commands/SetTimezoneCmd.js";
import { ViewTimezoneCmd } from "./commands/ViewTimezoneCmd.js";
import { getDateFormat } from "./functions/getDateFormat.js";
import { getGuildTz } from "./functions/getGuildTz.js";
import { getMemberTz } from "./functions/getMemberTz.js";
import { inGuildTz } from "./functions/inGuildTz.js";
import { inMemberTz } from "./functions/inMemberTz.js";
import { TimeAndDatePluginType, zTimeAndDateConfig } from "./types.js";

export const TimeAndDatePlugin = guildPlugin<TimeAndDatePluginType>()({
  name: "time_and_date",

  configSchema: zTimeAndDateConfig,
  defaultOverrides: [
    {
      level: ">=50",
      config: {
        can_set_timezone: true,
      },
    },
  ],

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
