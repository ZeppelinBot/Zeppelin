import { PluginOptions, guildPlugin } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { SendWelcomeMessageEvt } from "./events/SendWelcomeMessageEvt";
import { WelcomeMessagePluginType, zWelcomeMessageConfig } from "./types";

const defaultOptions: PluginOptions<WelcomeMessagePluginType> = {
  config: {
    send_dm: false,
    send_to_channel: null,
    message: null,
  },
};

export const WelcomeMessagePlugin = guildPlugin<WelcomeMessagePluginType>()({
  name: "welcome_message",

  dependencies: () => [LogsPlugin],
  configParser: (input) => zWelcomeMessageConfig.parse(input),
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
