import { CooldownManager } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { trimPluginDescription } from "../../utils";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { VoiceStateUpdateEvt } from "./events/VoiceStateUpdateEvt";
import { CompanionChannelsPluginType, zCompanionChannelsConfig } from "./types";

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
    configSchema: zCompanionChannelsConfig,
  },

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
