import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { PluginOptions } from "knub";
import { SlowmodePluginType, ConfigSchema } from "./types";
import { GuildSlowmodes } from "src/data/GuildSlowmodes";
import { GuildSavedMessages } from "src/data/GuildSavedMessages";
import { GuildLogs } from "src/data/GuildLogs";
import { SECONDS } from "src/utils";
import { onMessageCreate } from "./util/onMessageCreate";
import { clearExpiredSlowmodes } from "./util/clearExpiredSlowmodes";
import { SlowmodeDisableCmd } from "./commands/SlowmodeDisableCmd";
import { SlowmodeClearCmd } from "./commands/SlowmodeClearCmd";
import { SlowmodeListCmd } from "./commands/SlowmodeListCmd";
import { SlowmodeGetChannelCmd } from "./commands/SlowmodeGetChannelCmd";
import { SlowmodeSetChannelCmd } from "./commands/SlowmodeSetChannelCmd";

const BOT_SLOWMODE_CLEAR_INTERVAL = 60 * SECONDS;

const defaultOptions: PluginOptions<SlowmodePluginType> = {
  config: {
    use_native_slowmode: true,

    can_manage: false,
    is_affected: true,
  },

  overrides: [
    {
      level: ">=50",
      config: {
        can_manage: true,
        is_affected: false,
      },
    },
  ],
};

export const SlowmodePlugin = zeppelinPlugin<SlowmodePluginType>()("slowmode", {
  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  commands: [
    SlowmodeDisableCmd,
    SlowmodeClearCmd,
    SlowmodeListCmd,
    SlowmodeGetChannelCmd,
    SlowmodeSetChannelCmd,
  ],

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.slowmodes = GuildSlowmodes.getGuildInstance(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.logs = new GuildLogs(guild.id);
    state.clearInterval = setInterval(() => clearExpiredSlowmodes(pluginData), BOT_SLOWMODE_CLEAR_INTERVAL);

    state.onMessageCreateFn = msg => onMessageCreate(pluginData, msg);
    state.savedMessages.events.on("create", state.onMessageCreateFn);
  },

  onUnload(pluginData) {
    pluginData.state.savedMessages.events.off("create", pluginData.state.onMessageCreateFn);
  },
});
