import { decorators as d, Plugin } from "knub";
import { Message, TextChannel } from "eris";
import {
  getEmojiInString,
  getRoleMentions,
  getUrlsInString,
  getUserMentions,
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

  protected recentActions: IRecentAction[];

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
    this.expiryInterval = setInterval(() => this.clearOldRecentActions(), 1000 * 60);
    this.recentActions = [];
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
    this.recentActions.push({
      type,
      userId,
      channelId,
      msg,
      timestamp,
      count
    });
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
    const header = `Server: ${this.guild.name} (${this.guild.id}), channel: #${channel.name} (${
      channel.id
    })`;
    const logId = await this.spamLogs.createFromMessages(messages, header);

    const url = this.knub.getGlobalConfig().url;
    return url ? `${url}/spam-logs/${logId}` : `Log ID: ${logId}`;
  }

  async detectSpam(
    msg: Message,
    type: RecentActionType,
    spamConfig: any,
    actionCount: number,
    description: string
  ) {
    if (actionCount === 0) return;

    const since = msg.timestamp - 1000 * spamConfig.interval;

    this.addRecentAction(type, msg.author.id, msg.channel.id, msg, msg.timestamp, actionCount);
    const recentActionsCount = this.getRecentActionCount(
      type,
      msg.author.id,
      msg.channel.id,
      since
    );

    if (recentActionsCount > spamConfig.count) {
      const recentActions = this.getRecentActions(type, msg.author.id, msg.channel.id, since);
      const logUrl = await this.saveSpamLogs(recentActions.map(a => a.msg));

      if (spamConfig.clean !== false) {
        const msgIds = recentActions.map(a => a.msg.id);
        await this.bot.deleteMessages(msg.channel.id, msgIds);

        this.logs.log(LogType.SPAM_DELETE, {
          member: stripObjectToScalars(msg.member, ["user"]),
          channel: stripObjectToScalars(msg.channel),
          description,
          limit: spamConfig.count,
          interval: spamConfig.interval,
          logUrl
        });
      }

      if (spamConfig.mute) {
        // For muting the user, we use the ModActions plugin
        // This means that spam mute functionality requires the ModActions plugin to be loaded
        const guildData = this.knub.getGuildData(this.guildId);
        const modActionsPlugin = guildData.loadedPlugins.get("mod_actions") as ModActionsPlugin;
        if (!modActionsPlugin) return;

        this.logs.ignoreLog(LogType.MEMBER_ROLE_ADD, msg.member.id);
        await modActionsPlugin.muteMember(
          msg.member,
          spamConfig.mute_time ? spamConfig.mute_time * 60 * 1000 : 120 * 1000,
          "Automatic spam detection"
        );
        await modActionsPlugin.createCase(
          msg.member.id,
          this.bot.user.id,
          CaseType.Mute,
          null,
          trimLines(`
            Automatic spam detection: ${description} (over ${spamConfig.count} in ${
            spamConfig.interval
          }s)
            ${logUrl}
          `),
          true
        );
        this.logs.log(LogType.MEMBER_MUTE_SPAM, {
          member: stripObjectToScalars(msg.member, ["user"]),
          channel: stripObjectToScalars(msg.channel),
          description,
          limit: spamConfig.count,
          interval: spamConfig.interval
        });
      }

      return;
    }
  }

  @d.event("messageCreate")
  onMessageCreate(msg: Message) {
    if (msg.author.bot) return;

    const maxMessages = this.configValueForMsg(msg, "max_messages");
    if (maxMessages) {
      this.detectSpam(msg, RecentActionType.Message, maxMessages, 1, "too many messages");
    }

    const maxMentions = this.configValueForMsg(msg, "max_mentions");
    const mentions = msg.content
      ? [...getUserMentions(msg.content), ...getRoleMentions(msg.content)]
      : [];
    if (maxMentions && mentions.length) {
      this.detectSpam(
        msg,
        RecentActionType.Mention,
        maxMentions,
        mentions.length,
        "too many mentions"
      );
    }

    const maxLinks = this.configValueForMsg(msg, "max_links");
    if (maxLinks && msg.content) {
      const links = getUrlsInString(msg.content);
      this.detectSpam(msg, RecentActionType.Link, maxLinks, links.length, "too many links");
    }

    const maxAttachments = this.configValueForMsg(msg, "max_attachments");
    if (maxAttachments && msg.attachments.length) {
      this.detectSpam(
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
      this.detectSpam(msg, RecentActionType.Emoji, maxEmoji, emojiCount, "too many emoji");
    }

    const maxNewlines = this.configValueForMsg(msg, "max_newlines");
    if (maxNewlines && msg.content) {
      const newlineCount = (msg.content.match(/\n/g) || []).length;
      this.detectSpam(
        msg,
        RecentActionType.Newline,
        maxNewlines,
        newlineCount,
        "too many newlines"
      );
    }

    // TODO: Max duplicates
  }
}
