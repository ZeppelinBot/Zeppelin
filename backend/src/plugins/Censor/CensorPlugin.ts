import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { PluginOptions } from "knub";
import { ConfigSchema, CensorPluginType } from "./types";
import { GuildLogs } from "src/data/GuildLogs";
import { GuildSavedMessages } from "src/data/GuildSavedMessages";
import { onMessageCreate } from "./util/onMessageCreate";
import { onMessageUpdate } from "./util/onMessageUpdate";

const defaultOptions: PluginOptions<CensorPluginType> = {
  config: {
    filter_zalgo: false,
    filter_invites: true,
    invite_guild_whitelist: null,
    invite_guild_blacklist: null,
    invite_code_whitelist: null,
    invite_code_blacklist: null,
    allow_group_dm_invites: false,

    filter_domains: false,
    domain_whitelist: null,
    domain_blacklist: null,

    blocked_tokens: null,
    blocked_words: null,
    blocked_regex: null,
  },

  overrides: [
    {
      level: ">=50",
      config: {
        filter_zalgo: false,
        filter_invites: false,
        filter_domains: false,
        blocked_tokens: null,
        blocked_words: null,
        blocked_regex: null,
      },
    },
  ],
};

export const CensorPlugin = zeppelinPlugin<CensorPluginType>()("censor", {
  configSchema: ConfigSchema,
  defaultOptions,

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.serverLogs = new GuildLogs(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);

    state.onMessageCreateFn = msg => onMessageCreate(pluginData, msg);
    state.savedMessages.events.on("create", state.onMessageCreateFn);

    state.onMessageUpdateFn = msg => onMessageUpdate(pluginData, msg);
    state.savedMessages.events.on("update", state.onMessageUpdateFn);
  },

  onUnload(pluginData) {
    pluginData.state.savedMessages.events.off("create", pluginData.state.onMessageCreateFn);
    pluginData.state.savedMessages.events.off("update", pluginData.state.onMessageUpdateFn);
  },
});
