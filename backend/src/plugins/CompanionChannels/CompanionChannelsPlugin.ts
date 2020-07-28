import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { CompanionChannelsPluginType, ConfigSchema, TCompanionChannelOpts } from "./types";
import { VoiceChannelJoinEvt } from "./events/VoiceChannelJoinEvt";
import { VoiceChannelSwitchEvt } from "./events/VoiceChannelSwitchEvt";
import { VoiceChannelLeaveEvt } from "./events/VoiceChannelLeaveEvt";

const defaultOptions = {
  config: {
    entries: {},
  },
};

export const CompanionChannelsPlugin = zeppelinPlugin<CompanionChannelsPluginType>()("companion_channels", {
  configSchema: ConfigSchema,
  defaultOptions,

  events: [VoiceChannelJoinEvt, VoiceChannelSwitchEvt, VoiceChannelLeaveEvt],
});
