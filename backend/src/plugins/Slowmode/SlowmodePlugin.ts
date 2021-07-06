import { PluginOptions } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildSlowmodes } from "../../data/GuildSlowmodes";
import { SECONDS } from "../../utils";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { SlowmodeClearCmd } from "./commands/SlowmodeClearCmd";
import { SlowmodeDisableCmd } from "./commands/SlowmodeDisableCmd";
import { SlowmodeGetCmd } from "./commands/SlowmodeGetCmd";
import { SlowmodeListCmd } from "./commands/SlowmodeListCmd";
import { SlowmodeSetCmd } from "./commands/SlowmodeSetCmd";
import { ConfigSchema, SlowmodePluginType } from "./types";
import { clearExpiredSlowmodes } from "./util/clearExpiredSlowmodes";
import { onMessageCreate } from "./util/onMessageCreate";

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

export const SlowmodePlugin = zeppelinGuildPlugin<SlowmodePluginType>()({
  name: "slowmode",
  showInDocs: true,
  info: {
    prettyName: "Slowmode",
  },

  dependencies: [LogsPlugin],
  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  commands: [
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
  },

  afterLoad(pluginData) {
    const { state } = pluginData;

    state.serverLogs = new GuildLogs(pluginData.guild.id);
    state.clearInterval = setInterval(() => clearExpiredSlowmodes(pluginData), BOT_SLOWMODE_CLEAR_INTERVAL);

    state.onMessageCreateFn = msg => onMessageCreate(pluginData, msg);
    state.savedMessages.events.on("create", state.onMessageCreateFn);
  },

  beforeUnload(pluginData) {
    pluginData.state.savedMessages.events.off("create", pluginData.state.onMessageCreateFn);
    clearInterval(pluginData.state.clearInterval);
  },
});
