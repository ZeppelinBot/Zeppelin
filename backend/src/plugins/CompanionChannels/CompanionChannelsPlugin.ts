import { CooldownManager, guildPlugin } from "knub";
import { GuildLogs } from "../../data/GuildLogs.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { VoiceStateUpdateEvt } from "./events/VoiceStateUpdateEvt.js";
import { CompanionChannelsPluginType, zCompanionChannelsConfig } from "./types.js";
import { companionChannelsPluginDocs } from "./docs.js";

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
