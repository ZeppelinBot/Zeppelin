import { decorators as d, Plugin } from "knub";
import { Message, TextChannel } from "eris";
import {
  getEmojiInString,
  getRoleMentions,
  getUrlsInString,
  getUserMentions,
  sleep,
  stripObjectToScalars,
  trimLines
} from "../utils";
import { LogType } from "../data/LogType";
import { GuildLogs } from "../data/GuildLogs";
import { ModActionsPlugin } from "./ModActions";
import { CaseType } from "../data/CaseType";
import { GuildSpamLogs } from "../data/GuildSpamLogs";

enum RecentActionType {
  Message = 1,
  Mention,
  Link,
  Attachment,
  Emoji,
  Newline
}

interface IRecentAction {
  type: RecentActionType;
  userId: string;
  channelId: string;
  msg: Message;
  timestamp: number;
  count: number;
}

const MAX_INTERVAL = 300;

export class SpamPlugin extends Plugin {
  protected logs: GuildLogs;
  protected spamLogs: GuildSpamLogs;

  // Handle spam detection with a queue so we don't have overlapping detections on the same user
  protected spamDetectionQueue: Promise<void>;

  // List of recent potentially-spammy actions
  protected recentActions: IRecentAction[];

  // A map of userId => channelId => msgId
  // Keeps track of the last handled (= spam detected and acted on) message ID per user, per channel
  // TODO: Prevent this from growing infinitely somehow
  protected lastHandledMsgIds: Map<string, Map<string, string>>;

  private expiryInterval;

  getDefaultOptions() {
    return {
      config: {
        max_messages: null,
        max_mentions: null,
        max_links: null,
        max_attachments: null,
        max_emojis: null,
        max_newlines: null,
        max_duplicates: null
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
            max_duplicates: null
          }
        }
      ]
    };
  }

  onLoad() {
    this.logs = new GuildLogs(this.guildId);
    this.spamLogs = new GuildSpamLogs(this.guildId);

    this.recentActions = [];
    this.expiryInterval = setInterval(() => this.clearOldRecentActions(), 1000 * 60);
    this.lastHandledMsgIds = new Map();

    this.spamDetectionQueue = Promise.resolve();
  }

  onUnload() {
    clearInterval(this.expiryInterval);
  }

  addRecentAction(
    type: RecentActionType,
    userId: string,
    channelId: string,
    msg: Message,
    timestamp: number,
    count = 1
  ) {
    this.recentActions.push({ type, userId, channelId, msg, timestamp, count });
  }

  getRecentActions(type: RecentActionType, userId: string, channelId: string, since: number) {
    return this.recentActions.filter(action => {
      if (action.timestamp < since) return false;
      if (action.type !== type) return false;
      if (action.channelId !== channelId) return false;
      if (action.userId !== userId) return false;
      return true;
    });
  }

  getRecentActionCount(type: RecentActionType, userId: string, channelId: string, since: number) {
    return this.recentActions.reduce((count, action) => {
      if (action.timestamp < since) return count;
      if (action.type !== type) return count;
      if (action.channelId !== channelId) return count;
      if (action.userId !== userId) return false;
      return count + action.count;
    }, 0);
  }

  clearRecentUserActions(type: RecentActionType, userId: string, channelId: string) {
    this.recentActions = this.recentActions.filter(action => {
      return action.type !== type || action.userId !== userId || action.channelId !== channelId;
    });
  }

  clearOldRecentActions() {
    // TODO: Figure out expiry time from longest interval in the config?
    const expiryTimestamp = Date.now() - 1000 * MAX_INTERVAL;
    this.recentActions = this.recentActions.filter(action => action.timestamp >= expiryTimestamp);
  }

  async saveSpamLogs(messages: Message[]) {
    const channel = messages[0].channel as TextChannel;
    const header = `Server: ${this.guild.name} (${this.guild.id}), channel: #${channel.name} (${channel.id})`;
    const logId = await this.spamLogs.createFromMessages(messages, header);

    const url = this.knub.getGlobalConfig().url;
    return url ? `${url}/spam-logs/${logId}` : `Log ID: ${logId}`;
  }

  async logAndDetectSpam(
    msg: Message,
    type: RecentActionType,
    spamConfig: any,
    actionCount: number,
    description: string
  ) {
    if (actionCount === 0) return;

    // Make sure we're not handling some messages twice
    if (this.lastHandledMsgIds.has(msg.author.id)) {
      const channelMap = this.lastHandledMsgIds.get(msg.author.id);
      if (channelMap.has(msg.channel.id)) {
        const lastHandledMsgId = channelMap.get(msg.channel.id);
        if (lastHandledMsgId >= msg.id) return;
      }
    }

    this.spamDetectionQueue = this.spamDetectionQueue.then(
      async () => {
        // Log this action...
        this.addRecentAction(type, msg.author.id, msg.channel.id, msg, msg.timestamp, actionCount);

        // ...and then check if it trips the spam filters
        const since = msg.timestamp - 1000 * spamConfig.interval;
        const recentActionsCount = this.getRecentActionCount(type, msg.author.id, msg.channel.id, since);

        // If the user tripped the spam filter...
        if (recentActionsCount > spamConfig.count) {
          const recentActions = this.getRecentActions(type, msg.author.id, msg.channel.id, since);
          let modActionsPlugin;

          // Start by muting them, if enabled
          if (spamConfig.mute) {
            // We use the ModActions plugin for muting the user
            // This means that spam mute functionality requires the ModActions plugin to be loaded
            const guildData = this.knub.getGuildData(this.guildId);
            modActionsPlugin = guildData.loadedPlugins.get("mod_actions") as ModActionsPlugin;
            if (!modActionsPlugin) return;

            const muteTime = spamConfig.mute_time ? spamConfig.mute_time * 60 * 1000 : 120 * 1000;

            this.logs.ignoreLog(LogType.MEMBER_ROLE_ADD, msg.member.id);
            modActionsPlugin.muteMember(msg.member, muteTime, "Automatic spam detection");
          }

          // Get the offending message IDs
          // We also get the IDs of any messages after the last offending message, to account for lag before detection
          const messages = recentActions.map(a => a.msg);
          const msgIds = messages.map(m => m.id);
          const lastDetectedMsgId = msgIds[msgIds.length - 1];
          const additionalMessages = await this.bot.getMessages(msg.channel.id, 100, null, lastDetectedMsgId);
          additionalMessages.forEach(m => msgIds.push(m.id));

          // Then, if enabled, remove the spam messages
          if (spamConfig.clean !== false) {
            msgIds.forEach(id => this.logs.ignoreLog(LogType.MESSAGE_DELETE, id));
            this.bot.deleteMessages(msg.channel.id, msgIds);
          }

          // Store the ID of the last handled message
          const uniqueMessages = Array.from(new Set([...messages, ...additionalMessages]));
          uniqueMessages.sort((a, b) => (a.id > b.id ? 1 : -1));
          const lastHandledMsgId = uniqueMessages.reduce((last: string, m: Message): string => {
            return !last || m.id > last ? m.id : last;
          }, null);

          if (!this.lastHandledMsgIds.has(msg.author.id)) {
            this.lastHandledMsgIds.set(msg.author.id, new Map());
          }

          const channelMap = this.lastHandledMsgIds.get(msg.author.id);
          channelMap.set(msg.channel.id, lastHandledMsgId);

          // Clear the handled actions from recentActions
          this.clearRecentUserActions(type, msg.author.id, msg.channel.id);

          // Generate a log from the detected messages
          const logUrl = await this.saveSpamLogs(uniqueMessages);

          // Create a case and log the actions taken above
          const caseType = spamConfig.mute ? CaseType.Mute : CaseType.Note;
          const caseText = trimLines(`
          Automatic spam detection: ${description} (over ${spamConfig.count} in ${spamConfig.interval}s)
          ${logUrl}
        `);

          this.logs.log(LogType.SPAM_DETECTED, {
            member: stripObjectToScalars(msg.member, ["user"]),
            channel: stripObjectToScalars(msg.channel),
            description,
            limit: spamConfig.count,
            interval: spamConfig.interval,
            logUrl
          });

          const caseId = await modActionsPlugin.createCase(
            msg.member.id,
            this.bot.user.id,
            caseType,
            null,
            caseText,
            true
          );

          // For mutes, also set the mute's case id (for !mutes)
          if (spamConfig.mute) {
            await modActionsPlugin.mutes.setCaseId(msg.member.id, caseId);
          }
        }
      },
      err => {
        console.error("Error while detecting spam:");
        console.error(err);
      }
    );
  }

  @d.event("messageCreate")
  async onMessageCreate(msg: Message) {
    if (msg.author.bot) return;

    const maxMessages = this.configValueForMsg(msg, "max_messages");
    if (maxMessages) {
      this.logAndDetectSpam(msg, RecentActionType.Message, maxMessages, 1, "too many messages");
    }

    const maxMentions = this.configValueForMsg(msg, "max_mentions");
    const mentions = msg.content ? [...getUserMentions(msg.content), ...getRoleMentions(msg.content)] : [];
    if (maxMentions && mentions.length) {
      this.logAndDetectSpam(msg, RecentActionType.Mention, maxMentions, mentions.length, "too many mentions");
    }

    const maxLinks = this.configValueForMsg(msg, "max_links");
    if (maxLinks && msg.content) {
      const links = getUrlsInString(msg.content);
      this.logAndDetectSpam(msg, RecentActionType.Link, maxLinks, links.length, "too many links");
    }

    const maxAttachments = this.configValueForMsg(msg, "max_attachments");
    if (maxAttachments && msg.attachments.length) {
      this.logAndDetectSpam(
        msg,
        RecentActionType.Attachment,
        maxAttachments,
        msg.attachments.length,
        "too many attachments"
      );
    }

    const maxEmoji = this.configValueForMsg(msg, "max_emoji");
    if (maxEmoji && msg.content) {
      const emojiCount = getEmojiInString(msg.content).length;
      this.logAndDetectSpam(msg, RecentActionType.Emoji, maxEmoji, emojiCount, "too many emoji");
    }

    const maxNewlines = this.configValueForMsg(msg, "max_newlines");
    if (maxNewlines && msg.content) {
      const newlineCount = (msg.content.match(/\n/g) || []).length;
      this.logAndDetectSpam(msg, RecentActionType.Newline, maxNewlines, newlineCount, "too many newlines");
    }

    // TODO: Max duplicates
  }
}
