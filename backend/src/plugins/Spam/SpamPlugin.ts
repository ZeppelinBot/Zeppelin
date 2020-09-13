import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { PluginOptions } from "knub";
import { ConfigSchema, SpamPluginType } from "./types";
import { GuildLogs } from "src/data/GuildLogs";
import { GuildArchives } from "src/data/GuildArchives";
import { GuildSavedMessages } from "src/data/GuildSavedMessages";
import { GuildMutes } from "src/data/GuildMutes";
import { onMessageCreate } from "./util/onMessageCreate";
import { clearOldRecentActions } from "./util/clearOldRecentActions";
import { SpamVoiceJoinEvt, SpamVoiceSwitchEvt } from "./events/SpamVoiceEvt";
import { trimPluginDescription } from "../../utils";
import { LogsPlugin } from "../Logs/LogsPlugin";

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

export const SpamPlugin = zeppelinPlugin<SpamPluginType>()("spam", {
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
    SpamVoiceJoinEvt,
    SpamVoiceSwitchEvt,
  ],

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.logs = new GuildLogs(guild.id);
    state.archives = GuildArchives.getGuildInstance(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.mutes = GuildMutes.getGuildInstance(guild.id);

    state.recentActions = [];
    state.expiryInterval = setInterval(() => clearOldRecentActions(pluginData), 1000 * 60);
    state.lastHandledMsgIds = new Map();

    state.spamDetectionQueue = Promise.resolve();

    state.onMessageCreateFn = msg => onMessageCreate(pluginData, msg);
    state.savedMessages.events.on("create", state.onMessageCreateFn);
  },

  onUnload(pluginData) {
    pluginData.state.savedMessages.events.off("create", pluginData.state.onMessageCreateFn);
  },
});
