import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { PluginOptions } from "knub";
import { ConfigSchema, WelcomeMessagePluginType } from "./types";
import { GuildLogs } from "../../data/GuildLogs";
import { SendWelcomeMessageEvt } from "./events/SendWelcomeMessageEvt";

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
  },

  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  events: [
    SendWelcomeMessageEvt,
  ],

  afterLoad(pluginData) {
    const { state, guild } = pluginData;

    state.logs = new GuildLogs(guild.id);
    state.sentWelcomeMessages = new Set();
  },
});
