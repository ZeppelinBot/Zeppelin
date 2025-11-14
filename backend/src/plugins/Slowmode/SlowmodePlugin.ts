import { guildPlugin } from "vety";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { GuildSlowmodes } from "../../data/GuildSlowmodes.js";
import { SECONDS } from "../../utils.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { SlowmodeClearCmd } from "./commands/SlowmodeClearCmd.js";
import { SlowmodeDisableCmd } from "./commands/SlowmodeDisableCmd.js";
import { SlowmodeGetCmd } from "./commands/SlowmodeGetCmd.js";
import { SlowmodeListCmd } from "./commands/SlowmodeListCmd.js";
import { SlowmodeSetCmd } from "./commands/SlowmodeSetCmd.js";
import { SlowmodePluginType, zSlowmodeConfig } from "./types.js";
import { clearExpiredSlowmodes } from "./util/clearExpiredSlowmodes.js";
import { onMessageCreate } from "./util/onMessageCreate.js";

const BOT_SLOWMODE_CLEAR_INTERVAL = 60 * SECONDS;

export const SlowmodePlugin = guildPlugin<SlowmodePluginType>()({
  name: "slowmode",

  // prettier-ignore
  dependencies: () => [
    LogsPlugin,
  ],

  configSchema: zSlowmodeConfig,
  defaultOverrides: [
    {
      level: ">=50",
      config: {
        can_manage: true,
        is_affected: false,
      },
    },
  ],

  // prettier-ignore
  messageCommands: [
    SlowmodeDisableCmd,
    SlowmodeClearCmd,
    SlowmodeListCmd,
    SlowmodeGetCmd,
    SlowmodeSetCmd,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.slowmodes = GuildSlowmodes.getGuildInstance(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.logs = new GuildLogs(guild.id);
    state.channelSlowmodeCache = new Map();
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },

  afterLoad(pluginData) {
    const { state } = pluginData;

    state.serverLogs = new GuildLogs(pluginData.guild.id);
    state.clearInterval = setInterval(() => clearExpiredSlowmodes(pluginData), BOT_SLOWMODE_CLEAR_INTERVAL);

    state.onMessageCreateFn = (msg) => onMessageCreate(pluginData, msg);
    state.savedMessages.events.on("create", state.onMessageCreateFn);
  },

  beforeUnload(pluginData) {
    const { state } = pluginData;

    state.savedMessages.events.off("create", state.onMessageCreateFn);
    clearInterval(state.clearInterval);
  },
});
