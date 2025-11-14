import { guildPlugin } from "vety";
import { GuildArchives } from "../../data/GuildArchives.js";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildMutes } from "../../data/GuildMutes.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { SpamVoiceStateUpdateEvt } from "./events/SpamVoiceEvt.js";
import { SpamPluginType, zSpamConfig } from "./types.js";
import { clearOldRecentActions } from "./util/clearOldRecentActions.js";
import { onMessageCreate } from "./util/onMessageCreate.js";

export const SpamPlugin = guildPlugin<SpamPluginType>()({
  name: "spam",

  dependencies: () => [LogsPlugin],
  configSchema: zSpamConfig,
  defaultOverrides: [
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
    state.onMessageCreateFn = (msg) => onMessageCreate(pluginData, msg);
    state.savedMessages.events.on("create", state.onMessageCreateFn);
  },

  beforeUnload(pluginData) {
    const { state } = pluginData;

    state.savedMessages.events.off("create", state.onMessageCreateFn);
    clearInterval(state.expiryInterval);
  },
});
