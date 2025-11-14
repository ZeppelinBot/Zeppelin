import { guildPlugin } from "vety";
import { GuildLogs } from "../../data/GuildLogs.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { SendWelcomeMessageEvt } from "./events/SendWelcomeMessageEvt.js";
import { WelcomeMessagePluginType, zWelcomeMessageConfig } from "./types.js";

export const WelcomeMessagePlugin = guildPlugin<WelcomeMessagePluginType>()({
  name: "welcome_message",

  dependencies: () => [LogsPlugin],
  configSchema: zWelcomeMessageConfig,

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
