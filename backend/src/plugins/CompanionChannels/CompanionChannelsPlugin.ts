import { CooldownManager, guildPlugin } from "vety";
import { GuildLogs } from "../../data/GuildLogs.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { VoiceStateUpdateEvt } from "./events/VoiceStateUpdateEvt.js";
import { CompanionChannelsPluginType, zCompanionChannelsConfig } from "./types.js";

export const CompanionChannelsPlugin = guildPlugin<CompanionChannelsPluginType>()({
  name: "companion_channels",

  dependencies: () => [LogsPlugin],
  configSchema: zCompanionChannelsConfig,

  events: [VoiceStateUpdateEvt],

  beforeLoad(pluginData) {
    pluginData.state.errorCooldownManager = new CooldownManager();
  },

  afterLoad(pluginData) {
    pluginData.state.serverLogs = new GuildLogs(pluginData.guild.id);
  },
});
