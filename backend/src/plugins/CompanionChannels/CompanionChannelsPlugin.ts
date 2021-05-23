import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { CompanionChannelsPluginType, ConfigSchema, TCompanionChannelOpts } from "./types";
import { VoiceChannelJoinEvt } from "./events/VoiceChannelJoinEvt";
import { VoiceChannelSwitchEvt } from "./events/VoiceChannelSwitchEvt";
import { VoiceChannelLeaveEvt } from "./events/VoiceChannelLeaveEvt";
import { trimPluginDescription } from "../../utils";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { CooldownManager } from "knub";

const defaultOptions = {
  config: {
    entries: {},
  },
};

export const CompanionChannelsPlugin = zeppelinGuildPlugin<CompanionChannelsPluginType>()({
  name: "companion_channels",
  showInDocs: true,
  info: {
    prettyName: "Companion channels",
    description: trimPluginDescription(`
      Set up 'companion channels' between text and voice channels.
      Once set up, any time a user joins one of the specified voice channels,
      they'll get channel permissions applied to them for the text channels.
    `),
  },

  dependencies: [LogsPlugin],
  configSchema: ConfigSchema,
  defaultOptions,

  events: [VoiceChannelJoinEvt, VoiceChannelSwitchEvt, VoiceChannelLeaveEvt],

  afterLoad(pluginData) {
    pluginData.state.errorCooldownManager = new CooldownManager();
  },
});
