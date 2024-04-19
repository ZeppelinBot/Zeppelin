import { CooldownManager, guildPlugin } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { VoiceStateUpdateEvt } from "./events/VoiceStateUpdateEvt";
import { CompanionChannelsPluginType, zCompanionChannelsConfig } from "./types";

const defaultOptions = {
  config: {
    entries: {},
  },
};

export const CompanionChannelsPlugin = guildPlugin<CompanionChannelsPluginType>()({
  name: "companion_channels",

  dependencies: () => [LogsPlugin],
  configParser: (input) => zCompanionChannelsConfig.parse(input),
  defaultOptions,

  events: [VoiceStateUpdateEvt],

  beforeLoad(pluginData) {
    pluginData.state.errorCooldownManager = new CooldownManager();
  },

  afterLoad(pluginData) {
    pluginData.state.serverLogs = new GuildLogs(pluginData.guild.id);
  },
});
