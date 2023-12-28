import { PluginOptions } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { makeIoTsConfigParser } from "../../pluginUtils";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { SendWelcomeMessageEvt } from "./events/SendWelcomeMessageEvt";
import { ConfigSchema, WelcomeMessagePluginType } from "./types";

const defaultOptions: PluginOptions<WelcomeMessagePluginType> = {
  config: {
    send_dm: false,
    send_to_channel: null,
    message: null,
  },
};

export const WelcomeMessagePlugin = zeppelinGuildPlugin<WelcomeMessagePluginType>()({
  name: "welcome_message",
  showInDocs: true,
  info: {
    prettyName: "Welcome message",
    configSchema: ConfigSchema,
  },

  dependencies: () => [LogsPlugin],
  configParser: makeIoTsConfigParser(ConfigSchema),
  defaultOptions,

  // prettier-ignore
  events: [
    SendWelcomeMessageEvt,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.logs = new GuildLogs(guild.id);
    state.sentWelcomeMessages = new Set();
  },
});
