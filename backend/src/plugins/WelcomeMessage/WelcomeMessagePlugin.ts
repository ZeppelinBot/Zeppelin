import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { PluginOptions } from "knub";
import { WelcomeMessagePluginType, ConfigSchema } from "./types";
import { GuildLogs } from "src/data/GuildLogs";
import { SendWelcomeMessageEvt } from "./events/SendWelcomeMessageEvt";

const defaultOptions: PluginOptions<WelcomeMessagePluginType> = {
  config: {
    send_dm: false,
    send_to_channel: null,
    message: "",
  },
};

export const WelcomeMessagePlugin = zeppelinPlugin<WelcomeMessagePluginType>()("welcome_message", {
  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  events: [
    SendWelcomeMessageEvt,
  ],

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.logs = new GuildLogs(guild.id);
  },
});
