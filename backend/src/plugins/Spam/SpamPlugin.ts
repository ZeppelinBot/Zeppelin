import { PluginOptions } from "knub";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildMutes } from "../../data/GuildMutes";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { trimPluginDescription } from "../../utils";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { SpamVoiceStateUpdateEvt } from "./events/SpamVoiceEvt";
import { ConfigSchema, SpamPluginType } from "./types";
import { clearOldRecentActions } from "./util/clearOldRecentActions";
import { onMessageCreate } from "./util/onMessageCreate";

const defaultOptions: PluginOptions<SpamPluginType> = {
  config: {
    max_censor: null,
    max_messages: null,
    max_mentions: null,
    max_links: null,
    max_attachments: null,
    max_emojis: null,
    max_newlines: null,
    max_duplicates: null,
    max_characters: null,
    max_voice_moves: null,
  },
  overrides: [
    {
      level: ">=50",
      config: {
        max_messages: null,
        max_mentions: null,
        max_links: null,
        max_attachments: null,
        max_emojis: null,
        max_newlines: null,
        max_duplicates: null,
        max_characters: null,
        max_voice_moves: null,
      },
    },
  ],
};

export const SpamPlugin = zeppelinGuildPlugin<SpamPluginType>()({
  name: "spam",
  showInDocs: true,
  info: {
    prettyName: "Spam protection",
    description: trimPluginDescription(`
      Basic spam detection and auto-muting.
      For more advanced spam filtering, check out the Automod plugin!
    `),
  },

  dependencies: [LogsPlugin],

  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  events: [
    SpamVoiceStateUpdateEvt,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.logs = new GuildLogs(guild.id);
    state.archives = GuildArchives.getGuildInstance(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.mutes = GuildMutes.getGuildInstance(guild.id);

    state.recentActions = [];
    state.lastHandledMsgIds = new Map();

    state.spamDetectionQueue = Promise.resolve();
  },

  afterLoad(pluginData) {
    const { state } = pluginData;

    state.expiryInterval = setInterval(() => clearOldRecentActions(pluginData), 1000 * 60);
    state.onMessageCreateFn = msg => onMessageCreate(pluginData, msg);
    state.savedMessages.events.on("create", state.onMessageCreateFn);
  },

  beforeUnload(pluginData) {
    pluginData.state.savedMessages.events.off("create", pluginData.state.onMessageCreateFn);
    clearInterval(pluginData.state.expiryInterval);
  },
});
