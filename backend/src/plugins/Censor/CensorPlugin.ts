import { PluginOptions, guildPlugin } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { discardRegExpRunner, getRegExpRunner } from "../../regExpRunners";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { CensorPluginType, zCensorConfig } from "./types";
import { onMessageCreate } from "./util/onMessageCreate";
import { onMessageUpdate } from "./util/onMessageUpdate";

const defaultOptions: PluginOptions<CensorPluginType> = {
  config: {
    filter_zalgo: false,
    filter_invites: false,
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

export const CensorPlugin = guildPlugin<CensorPluginType>()({
  name: "censor",

  dependencies: () => [LogsPlugin],
  configParser: (input) => zCensorConfig.parse(input),
  defaultOptions,

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.serverLogs = new GuildLogs(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);

    state.regexRunner = getRegExpRunner(`guild-${pluginData.guild.id}`);
  },

  afterLoad(pluginData) {
    const { state } = pluginData;

    state.onMessageCreateFn = (msg) => onMessageCreate(pluginData, msg);
    state.savedMessages.events.on("create", state.onMessageCreateFn);

    state.onMessageUpdateFn = (msg) => onMessageUpdate(pluginData, msg);
    state.savedMessages.events.on("update", state.onMessageUpdateFn);
  },

  beforeUnload(pluginData) {
    const { state, guild } = pluginData;

    discardRegExpRunner(`guild-${guild.id}`);

    state.savedMessages.events.off("create", state.onMessageCreateFn);
    state.savedMessages.events.off("update", state.onMessageUpdateFn);
  },
});
