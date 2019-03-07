import { decorators as d, IPluginOptions } from "knub";
import { Channel, Member } from "eris";
import humanizeDuration from "humanize-duration";
import {
  getEmojiInString,
  getRoleMentions,
  getUrlsInString,
  getUserMentions,
  stripObjectToScalars,
  trimLines,
} from "../utils";
import { LogType } from "../data/LogType";
import { GuildLogs } from "../data/GuildLogs";
import { CaseTypes } from "../data/CaseTypes";
import { GuildArchives } from "../data/GuildArchives";
import moment from "moment-timezone";
import { SavedMessage } from "../data/entities/SavedMessage";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { GuildActions } from "../data/GuildActions";
import { Case } from "../data/entities/Case";
import { GuildMutes } from "../data/GuildMutes";
import { ZeppelinPlugin } from "./ZeppelinPlugin";

enum RecentActionType {
  Message = 1,
  Mention,
  Link,
  Attachment,
  Emoji,
  Newline,
  Censor,
  Character,
  VoiceChannelMove,
}

interface IRecentAction<T> {
  type: RecentActionType;
  userId: string;
  actionGroupId: string;
  extraData: T;
  timestamp: number;
  count: number;
}

const MAX_INTERVAL = 300;

const SPAM_ARCHIVE_EXPIRY_DAYS = 90;

interface IBaseSingleSpamConfig {
  interval: number;
  count: number;
  mute?: boolean;
  mute_time?: number;
  clean?: boolean;
}

interface ISpamPluginConfig {
  max_censor: IBaseSingleSpamConfig;
  max_messages: IBaseSingleSpamConfig;
  max_mentions: IBaseSingleSpamConfig;
  max_links: IBaseSingleSpamConfig;
  max_attachments: IBaseSingleSpamConfig;
  max_emojis: IBaseSingleSpamConfig;
  max_newlines: IBaseSingleSpamConfig;
  max_duplicates: IBaseSingleSpamConfig;
  max_characters: IBaseSingleSpamConfig;
  max_voice_moves: IBaseSingleSpamConfig;
}

export class SpamPlugin extends ZeppelinPlugin<ISpamPluginConfig> {
  public static pluginName = "spam";

  protected actions: GuildActions;
  protected logs: GuildLogs;
  protected archives: GuildArchives;
  protected savedMessages: GuildSavedMessages;
  protected mutes: GuildMutes;

  private onMessageCreateFn;

  // Handle spam detection with a queue so we don't have overlapping detections on the same user
  protected spamDetectionQueue: Promise<void>;

  // List of recent potentially-spammy actions
  protected recentActions: Array<IRecentAction<any>>;

  // A map of userId => channelId => msgId
  // Keeps track of the last handled (= spam detected and acted on) message ID per user, per channel
  // TODO: Prevent this from growing infinitely somehow
  protected lastHandledMsgIds: Map<string, Map<string, string>>;

  private expiryInterval;

  getDefaultOptions(): IPluginOptions<ISpamPluginConfig> {
    return {
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

      permissions: {},

      // Default override to make mods immune to the spam filter
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
  }

  onLoad() {
    this.actions = GuildActions.getInstance(this.guildId);
    this.logs = new GuildLogs(this.guildId);
    this.archives = GuildArchives.getInstance(this.guildId);
    this.savedMessages = GuildSavedMessages.getInstance(this.guildId);
    this.mutes = GuildMutes.getInstance(this.guildId);

    this.recentActions = [];
    this.expiryInterval = setInterval(() => this.clearOldRecentActions(), 1000 * 60);
    this.lastHandledMsgIds = new Map();

    this.spamDetectionQueue = Promise.resolve();

    this.onMessageCreateFn = this.onMessageCreate.bind(this);
    this.savedMessages.events.on("create", this.onMessageCreateFn);
  }

  onUnload() {
    clearInterval(this.expiryInterval);
    this.savedMessages.events.off("create", this.onMessageCreateFn);
  }

  addRecentAction(
    type: RecentActionType,
    userId: string,
    actionGroupId: string,
    extraData: any,
    timestamp: number,
    count = 1,
  ) {
    this.recentActions.push({ type, userId, actionGroupId, extraData, timestamp, count });
  }

  getRecentActions(type: RecentActionType, userId: string, actionGroupId: string, since: number) {
    return this.recentActions.filter(action => {
      if (action.timestamp < since) return false;
      if (action.type !== type) return false;
      if (action.actionGroupId !== actionGroupId) return false;
      if (action.userId !== userId) return false;
      return true;
    });
  }

  getRecentActionCount(type: RecentActionType, userId: string, actionGroupId: string, since: number) {
    return this.recentActions.reduce((count, action) => {
      if (action.timestamp < since) return count;
      if (action.type !== type) return count;
      if (action.actionGroupId !== actionGroupId) return count;
      if (action.userId !== userId) return false;
      return count + action.count;
    }, 0);
  }

  clearRecentUserActions(type: RecentActionType, userId: string, actionGroupId: string) {
    this.recentActions = this.recentActions.filter(action => {
      return action.type !== type || action.userId !== userId || action.actionGroupId !== actionGroupId;
    });
  }

  clearOldRecentActions() {
    // TODO: Figure out expiry time from longest interval in the config?
    const expiryTimestamp = Date.now() - 1000 * MAX_INTERVAL;
    this.recentActions = this.recentActions.filter(action => action.timestamp >= expiryTimestamp);
  }

  async saveSpamArchives(savedMessages: SavedMessage[], channel: Channel) {
    const expiresAt = moment().add(SPAM_ARCHIVE_EXPIRY_DAYS, "days");
    const archiveId = await this.archives.createFromSavedMessages(savedMessages, this.guild, expiresAt);

    const baseUrl = this.knub.getGlobalConfig().url;
    return this.archives.getUrl(baseUrl, archiveId);
  }

  async logAndDetectMessageSpam(
    savedMessage: SavedMessage,
    type: RecentActionType,
    spamConfig: IBaseSingleSpamConfig,
    actionCount: number,
    description: string,
  ) {
    if (actionCount === 0) return;

    // Make sure we're not handling some messages twice
    if (this.lastHandledMsgIds.has(savedMessage.user_id)) {
      const channelMap = this.lastHandledMsgIds.get(savedMessage.user_id);
      if (channelMap.has(savedMessage.channel_id)) {
        const lastHandledMsgId = channelMap.get(savedMessage.channel_id);
        if (lastHandledMsgId >= savedMessage.id) return;
      }
    }

    this.spamDetectionQueue = this.spamDetectionQueue.then(
      async () => {
        const timestamp = moment(savedMessage.posted_at).valueOf();
        const member = this.guild.members.get(savedMessage.user_id);

        // Log this action...
        this.addRecentAction(type, savedMessage.user_id, savedMessage.channel_id, savedMessage, timestamp, actionCount);

        // ...and then check if it trips the spam filters
        const since = timestamp - 1000 * spamConfig.interval;
        const recentActionsCount = this.getRecentActionCount(
          type,
          savedMessage.user_id,
          savedMessage.channel_id,
          since,
        );

        // If the user tripped the spam filter...
        if (recentActionsCount > spamConfig.count) {
          const recentActions = this.getRecentActions(type, savedMessage.user_id, savedMessage.channel_id, since);

          // Start by muting them, if enabled
          let timeUntilUnmute;
          if (spamConfig.mute && member) {
            const muteTime = spamConfig.mute_time ? spamConfig.mute_time * 60 * 1000 : 120 * 1000;
            timeUntilUnmute = humanizeDuration(muteTime);
            this.logs.ignoreLog(LogType.MEMBER_ROLE_ADD, savedMessage.user_id);
            this.actions.fire("mute", { member, muteTime, reason: "Automatic spam detection" });
          }

          // Get the offending message IDs
          // We also get the IDs of any messages after the last offending message, to account for lag before detection
          const savedMessages = recentActions.map(a => a.extraData as SavedMessage);
          const msgIds = savedMessages.map(m => m.id);
          const lastDetectedMsgId = msgIds[msgIds.length - 1];

          const additionalMessages = await this.savedMessages.getUserMessagesByChannelAfterId(
            savedMessage.user_id,
            savedMessage.channel_id,
            lastDetectedMsgId,
          );
          additionalMessages.forEach(m => msgIds.push(m.id));

          // Then, if enabled, remove the spam messages
          if (spamConfig.clean !== false) {
            msgIds.forEach(id => this.logs.ignoreLog(LogType.MESSAGE_DELETE, id));
            this.bot.deleteMessages(savedMessage.channel_id, msgIds);
          }

          // Store the ID of the last handled message
          const uniqueMessages = Array.from(new Set([...savedMessages, ...additionalMessages]));
          uniqueMessages.sort((a, b) => (a.id > b.id ? 1 : -1));
          const lastHandledMsgId = uniqueMessages.reduce((last: string, m: SavedMessage): string => {
            return !last || m.id > last ? m.id : last;
          }, null);

          if (!this.lastHandledMsgIds.has(savedMessage.user_id)) {
            this.lastHandledMsgIds.set(savedMessage.user_id, new Map());
          }

          const channelMap = this.lastHandledMsgIds.get(savedMessage.user_id);
          channelMap.set(savedMessage.channel_id, lastHandledMsgId);

          // Clear the handled actions from recentActions
          this.clearRecentUserActions(type, savedMessage.user_id, savedMessage.channel_id);

          // Generate a log from the detected messages
          const channel = this.guild.channels.get(savedMessage.channel_id);
          const archiveUrl = await this.saveSpamArchives(uniqueMessages, channel);

          // Create a case and log the actions taken above
          const caseType = spamConfig.mute ? CaseTypes.Mute : CaseTypes.Note;
          let caseText = trimLines(`
            Automatic spam detection: ${description} (over ${spamConfig.count} in ${spamConfig.interval}s)
            ${archiveUrl}
          `);

          if (spamConfig.mute) {
            caseText = `__[Muted for ${timeUntilUnmute}]__ ${caseText}`;
          }

          this.logs.log(LogType.MESSAGE_SPAM_DETECTED, {
            member: stripObjectToScalars(member, ["user"]),
            channel: stripObjectToScalars(channel),
            description,
            limit: spamConfig.count,
            interval: spamConfig.interval,
            archiveUrl,
          });

          const theCase: Case = await this.actions.fire("createCase", {
            userId: savedMessage.user_id,
            modId: this.bot.user.id,
            type: caseType,
            reason: caseText,
            automatic: true,
          });

          // For mutes, also set the mute's case id (for !mutes)
          if (spamConfig.mute && member) {
            await this.mutes.setCaseId(savedMessage.user_id, theCase.id);
          }
        }
      },
      err => {
        console.error("Error while detecting spam:");
        console.error(err);
      },
    );
  }

  async logAndDetectOtherSpam(
    type: RecentActionType,
    spamConfig: any,
    userId: string,
    actionCount: number,
    actionGroupId: string,
    timestamp: number,
    extraData = null,
    description: string,
  ) {
    this.spamDetectionQueue = this.spamDetectionQueue.then(async () => {
      // Log this action...
      this.addRecentAction(type, userId, actionGroupId, extraData, timestamp, actionCount);

      // ...and then check if it trips the spam filters
      const since = timestamp - 1000 * spamConfig.interval;
      const recentActionsCount = this.getRecentActionCount(type, userId, actionGroupId, since);

      if (recentActionsCount > spamConfig.count) {
        const member = this.guild.members.get(userId);

        // Start by muting them, if enabled
        if (spamConfig.mute && member) {
          const muteTime = spamConfig.mute_time ? spamConfig.mute_time * 60 * 1000 : 120 * 1000;
          this.logs.ignoreLog(LogType.MEMBER_ROLE_ADD, userId);
          this.actions.fire("mute", { member, muteTime, reason: "Automatic spam detection" });
        }

        // Clear recent cases
        this.clearRecentUserActions(RecentActionType.VoiceChannelMove, userId, actionGroupId);

        // Create a case and log the actions taken above
        const caseType = spamConfig.mute ? CaseTypes.Mute : CaseTypes.Note;
        const caseText = trimLines(`
          Automatic spam detection: ${description} (over ${spamConfig.count} in ${spamConfig.interval}s)
        `);

        this.logs.log(LogType.OTHER_SPAM_DETECTED, {
          member: stripObjectToScalars(member, ["user"]),
          description,
          limit: spamConfig.count,
          interval: spamConfig.interval,
        });

        const theCase: Case = await this.actions.fire("createCase", {
          userId,
          modId: this.bot.user.id,
          type: caseType,
          reason: caseText,
          automatic: true,
        });

        // For mutes, also set the mute's case id (for !mutes)
        if (spamConfig.mute && member) {
          await this.mutes.setCaseId(userId, theCase.id);
        }
      }
    });
  }

  // For interoperability with the Censor plugin
  async logCensor(savedMessage: SavedMessage) {
    const config = this.getConfigForMemberIdAndChannelId(savedMessage.user_id, savedMessage.channel_id);
    const spamConfig = config.max_censor;

    if (spamConfig) {
      this.logAndDetectMessageSpam(savedMessage, RecentActionType.Censor, spamConfig, 1, "too many censored messages");
    }
  }

  async onMessageCreate(savedMessage: SavedMessage) {
    if (savedMessage.is_bot) return;

    const config = this.getConfigForMemberIdAndChannelId(savedMessage.user_id, savedMessage.channel_id);

    const maxMessages = config.max_messages;
    if (maxMessages) {
      this.logAndDetectMessageSpam(savedMessage, RecentActionType.Message, maxMessages, 1, "too many messages");
    }

    const maxMentions = config.max_mentions;
    const mentions = savedMessage.data.content
      ? [...getUserMentions(savedMessage.data.content), ...getRoleMentions(savedMessage.data.content)]
      : [];
    if (maxMentions && mentions.length) {
      this.logAndDetectMessageSpam(
        savedMessage,
        RecentActionType.Mention,
        maxMentions,
        mentions.length,
        "too many mentions",
      );
    }

    const maxLinks = config.max_links;
    if (maxLinks && savedMessage.data.content && typeof savedMessage.data.content === "string") {
      const links = getUrlsInString(savedMessage.data.content);
      this.logAndDetectMessageSpam(savedMessage, RecentActionType.Link, maxLinks, links.length, "too many links");
    }

    const maxAttachments = config.max_attachments;
    if (maxAttachments && savedMessage.data.attachments) {
      this.logAndDetectMessageSpam(
        savedMessage,
        RecentActionType.Attachment,
        maxAttachments,
        savedMessage.data.attachments.length,
        "too many attachments",
      );
    }

    const maxEmoji = config.max_emojis;
    if (maxEmoji && savedMessage.data.content) {
      const emojiCount = getEmojiInString(savedMessage.data.content).length;
      this.logAndDetectMessageSpam(savedMessage, RecentActionType.Emoji, maxEmoji, emojiCount, "too many emoji");
    }

    const maxNewlines = config.max_newlines;
    if (maxNewlines && savedMessage.data.content) {
      const newlineCount = (savedMessage.data.content.match(/\n/g) || []).length;
      this.logAndDetectMessageSpam(
        savedMessage,
        RecentActionType.Newline,
        maxNewlines,
        newlineCount,
        "too many newlines",
      );
    }

    const maxCharacters = config.max_characters;
    if (maxCharacters && savedMessage.data.content) {
      const characterCount = [...savedMessage.data.content.trim()].length;
      this.logAndDetectMessageSpam(
        savedMessage,
        RecentActionType.Character,
        maxCharacters,
        characterCount,
        "too many characters",
      );
    }

    // TODO: Max duplicates
  }

  @d.event("voiceChannelJoin")
  @d.event("voiceChannelSwitch")
  onVoiceChannelSwitch(member: Member, channel: Channel) {
    const config = this.getConfigForMemberIdAndChannelId(member.id, channel.id);
    const maxVoiceMoves = config.max_voice_moves;
    if (maxVoiceMoves) {
      this.logAndDetectOtherSpam(
        RecentActionType.VoiceChannelMove,
        maxVoiceMoves,
        member.id,
        1,
        "0",
        Date.now(),
        null,
        "too many voice channel moves",
      );
    }
  }
}
