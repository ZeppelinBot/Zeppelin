import { decorators as d, IPluginOptions, logger } from "knub";
import { Attachment, Channel, EmbedBase, Message, MessageContent, Role, TextChannel, User } from "eris";
import {
  errorMessage,
  downloadFile,
  getRoleMentions,
  trimLines,
  DBDateFormat,
  convertDelayStringToMS,
  SECONDS,
  sorter,
  disableCodeBlocks,
  deactivateMentions,
  createChunkedMessage,
  stripObjectToScalars,
  isValidEmbed,
  MINUTES,
  StrictMessageContent,
  DAYS,
} from "../utils";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { ZeppelinPlugin } from "./ZeppelinPlugin";

import fs from "fs";
import { GuildScheduledPosts } from "../data/GuildScheduledPosts";
import moment, { Moment } from "moment-timezone";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import * as t from "io-ts";
import humanizeDuration from "humanize-duration";

const ConfigSchema = t.type({
  can_post: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

const fsp = fs.promises;

const COLOR_MATCH_REGEX = /^#?([0-9a-f]{6})$/;

const SCHEDULED_POST_CHECK_INTERVAL = 5 * SECONDS;
const SCHEDULED_POST_PREVIEW_TEXT_LENGTH = 50;

const MIN_REPEAT_TIME = 5 * MINUTES;
const MAX_REPEAT_TIME = Math.pow(2, 32);
const MAX_REPEAT_UNTIL = moment().add(100, "years");

export class PostPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "post";
  public static configSchema = ConfigSchema;

  public static pluginInfo = {
    prettyName: "Post",
  };

  protected savedMessages: GuildSavedMessages;
  protected scheduledPosts: GuildScheduledPosts;
  protected logs: GuildLogs;

  private scheduledPostLoopTimeout;

  onLoad() {
    this.savedMessages = GuildSavedMessages.getGuildInstance(this.guildId);
    this.scheduledPosts = GuildScheduledPosts.getGuildInstance(this.guildId);
    this.logs = new GuildLogs(this.guildId);

    this.scheduledPostLoop();
  }

  onUnload() {
    clearTimeout(this.scheduledPostLoopTimeout);
  }

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        can_post: false,
      },

      overrides: [
        {
          level: ">=100",
          config: {
            can_post: true,
          },
        },
      ],
    };
  }

  protected formatContent(str) {
    return str.replace(/\\n/g, "\n");
  }

  protected async postMessage(
    channel: TextChannel,
    content: MessageContent,
    attachments: Attachment[] = [],
    enableMentions: boolean = false,
  ): Promise<Message> {
    if (typeof content === "string") {
      content = { content };
    }

    if (content && content.content) {
      content.content = this.formatContent(content.content);
    }

    let downloadedAttachment;
    let file;
    if (attachments.length) {
      downloadedAttachment = await downloadFile(attachments[0].url);
      file = {
        name: attachments[0].filename,
        file: await fsp.readFile(downloadedAttachment.path),
      };
    }

    const rolesMadeMentionable: Role[] = [];
    if (enableMentions && content.content) {
      const mentionedRoleIds = getRoleMentions(content.content);
      if (mentionedRoleIds != null) {
        for (const roleId of mentionedRoleIds) {
          const role = this.guild.roles.get(roleId);
          if (role && !role.mentionable) {
            await role.edit({
              mentionable: true,
            });
            rolesMadeMentionable.push(role);
          }
        }
      }

      content.disableEveryone = false;
    }

    const createdMsg = await channel.createMessage(content, file);
    this.savedMessages.setPermanent(createdMsg.id);

    for (const role of rolesMadeMentionable) {
      role.edit({
        mentionable: false,
      });
    }

    if (downloadedAttachment) {
      downloadedAttachment.deleteFn();
    }

    return createdMsg;
  }

  protected parseScheduleTime(str): Moment {
    const dt1 = moment(str, "YYYY-MM-DD HH:mm:ss");
    if (dt1 && dt1.isValid()) return dt1;

    const dt2 = moment(str, "YYYY-MM-DD HH:mm");
    if (dt2 && dt2.isValid()) return dt2;

    const date = moment(str, "YYYY-MM-DD");
    if (date && date.isValid()) return date;

    const t1 = moment(str, "HH:mm:ss");
    if (t1 && t1.isValid()) {
      if (t1.isBefore(moment())) t1.add(1, "day");
      return t1;
    }

    const t2 = moment(str, "HH:mm");
    if (t2 && t2.isValid()) {
      if (t2.isBefore(moment())) t2.add(1, "day");
      return t2;
    }

    const delayStringMS = convertDelayStringToMS(str, "m");
    if (delayStringMS) {
      return moment().add(delayStringMS, "ms");
    }

    return null;
  }

  protected async scheduledPostLoop() {
    const duePosts = await this.scheduledPosts.getDueScheduledPosts();
    for (const post of duePosts) {
      const channel = this.guild.channels.get(post.channel_id);
      if (channel instanceof TextChannel) {
        const [username, discriminator] = post.author_name.split("#");
        const author: Partial<User> = this.bot.users.get(post.author_id) || {
          id: post.author_id,
          username,
          discriminator,
        };

        try {
          const postedMessage = await this.postMessage(channel, post.content, post.attachments, post.enable_mentions);
          this.logs.log(LogType.POSTED_SCHEDULED_MESSAGE, {
            author: stripObjectToScalars(author),
            channel: stripObjectToScalars(channel),
            messageId: postedMessage.id,
          });
        } catch (e) {
          this.logs.log(LogType.BOT_ALERT, {
            body: `Failed to post scheduled message by {userMention(author)} to {channelMention(channel)}`,
            channel: stripObjectToScalars(channel),
            author: stripObjectToScalars(author),
          });
          logger.warn(
            `Failed to post scheduled message to #${channel.name} (${channel.id}) on ${this.guild.name} (${this.guildId})`,
          );
        }
      }

      let shouldClear = true;

      if (post.repeat_interval) {
        const nextPostAt = moment().add(post.repeat_interval, "ms");

        if (post.repeat_until) {
          const repeatUntil = moment(post.repeat_until, DBDateFormat);
          if (nextPostAt.isSameOrBefore(repeatUntil)) {
            await this.scheduledPosts.update(post.id, {
              post_at: nextPostAt.format(DBDateFormat),
            });
            shouldClear = false;
          }
        } else if (post.repeat_times) {
          if (post.repeat_times > 1) {
            await this.scheduledPosts.update(post.id, {
              post_at: nextPostAt.format(DBDateFormat),
              repeat_times: post.repeat_times - 1,
            });
            shouldClear = false;
          }
        }
      }

      if (shouldClear) {
        await this.scheduledPosts.delete(post.id);
      }
    }

    this.scheduledPostLoopTimeout = setTimeout(() => this.scheduledPostLoop(), SCHEDULED_POST_CHECK_INTERVAL);
  }

  /**
   * Since !post and !post_embed have a lot of overlap for post scheduling, repeating, etc., that functionality is abstracted out to here
   */
  async actualPostCmd(
    msg: Message,
    targetChannel: Channel,
    content: StrictMessageContent,
    opts?: {
      "enable-mentions"?: boolean;
      schedule?: string;
      repeat?: number;
      "repeat-until"?: string;
      "repeat-times"?: number;
    },
  ) {
    if (!(targetChannel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Channel is not a text channel"));
      return;
    }

    if (content == null && msg.attachments.length === 0) {
      msg.channel.createMessage(errorMessage("Message content or attachment required"));
      return;
    }

    if (opts.repeat) {
      if (opts.repeat < MIN_REPEAT_TIME) {
        return this.sendErrorMessage(msg.channel, `Minimum time for -repeat is ${humanizeDuration(MIN_REPEAT_TIME)}`);
      }
      if (opts.repeat > MAX_REPEAT_TIME) {
        return this.sendErrorMessage(msg.channel, `Max time for -repeat is ${humanizeDuration(MAX_REPEAT_TIME)}`);
      }
    }

    // If this is a scheduled or repeated post, figure out the next post date
    let postAt;
    if (opts.schedule) {
      // Schedule the post to be posted later
      postAt = this.parseScheduleTime(opts.schedule);
      if (!postAt) {
        return this.sendErrorMessage(msg.channel, "Invalid schedule time");
      }
    } else if (opts.repeat) {
      postAt = moment().add(opts.repeat, "ms");
    }

    // For repeated posts, make sure repeat-until or repeat-times is specified
    let repeatUntil: moment.Moment = null;
    let repeatTimes: number = null;
    let repeatDetailsStr: string = null;

    if (opts["repeat-until"]) {
      repeatUntil = this.parseScheduleTime(opts["repeat-until"]);

      // Invalid time
      if (!repeatUntil) {
        return this.sendErrorMessage(msg.channel, "Invalid time specified for -repeat-until");
      }
      if (repeatUntil.isBefore(moment())) {
        return this.sendErrorMessage(msg.channel, "You can't set -repeat-until in the past");
      }
      if (repeatUntil.isAfter(MAX_REPEAT_UNTIL)) {
        return this.sendErrorMessage(
          msg.channel,
          "Unfortunately, -repeat-until can only be at most 100 years into the future. Maybe 99 years would be enough?",
        );
      }
    } else if (opts["repeat-times"]) {
      repeatTimes = opts["repeat-times"];
      if (repeatTimes <= 0) {
        return this.sendErrorMessage(msg.channel, "-repeat-times must be 1 or more");
      }
    }

    if (repeatUntil && repeatTimes) {
      return this.sendErrorMessage(msg.channel, "You can only use one of -repeat-until or -repeat-times at once");
    }

    if (opts.repeat && !repeatUntil && !repeatTimes) {
      return this.sendErrorMessage(
        msg.channel,
        "You must specify -repeat-until or -repeat-times for repeated messages",
      );
    }

    if (opts.repeat) {
      repeatDetailsStr = repeatUntil
        ? `every ${humanizeDuration(opts.repeat)} until ${repeatUntil.format(DBDateFormat)}`
        : `every ${humanizeDuration(opts.repeat)}, ${repeatTimes} times in total`;
    }

    // Save schedule/repeat information in DB
    if (postAt) {
      if (postAt < moment()) {
        return this.sendErrorMessage(msg.channel, "Post can't be scheduled to be posted in the past");
      }

      await this.scheduledPosts.create({
        author_id: msg.author.id,
        author_name: `${msg.author.username}#${msg.author.discriminator}`,
        channel_id: targetChannel.id,
        content,
        attachments: msg.attachments,
        post_at: postAt.format(DBDateFormat),
        enable_mentions: opts["enable-mentions"],
        repeat_interval: opts.repeat,
        repeat_until: repeatUntil ? repeatUntil.format(DBDateFormat) : null,
        repeat_times: repeatTimes ?? null,
      });

      if (opts.repeat) {
        this.logs.log(LogType.SCHEDULED_REPEATED_MESSAGE, {
          author: stripObjectToScalars(msg.author),
          channel: stripObjectToScalars(targetChannel),
          date: postAt.format("YYYY-MM-DD"),
          time: postAt.format("HH:mm:ss"),
          repeatInterval: humanizeDuration(opts.repeat),
          repeatDetails: repeatDetailsStr,
        });
      } else {
        this.logs.log(LogType.SCHEDULED_MESSAGE, {
          author: stripObjectToScalars(msg.author),
          channel: stripObjectToScalars(targetChannel),
          date: postAt.format("YYYY-MM-DD"),
          time: postAt.format("HH:mm:ss"),
        });
      }
    }

    // When the message isn't scheduled for later, post it immediately
    if (!opts.schedule) {
      await this.postMessage(targetChannel, content, msg.attachments, opts["enable-mentions"]);
    }

    if (opts.repeat) {
      this.logs.log(LogType.REPEATED_MESSAGE, {
        author: stripObjectToScalars(msg.author),
        channel: stripObjectToScalars(targetChannel),
        date: postAt.format("YYYY-MM-DD"),
        time: postAt.format("HH:mm:ss"),
        repeatInterval: humanizeDuration(opts.repeat),
        repeatDetails: repeatDetailsStr,
      });
    }

    // Bot reply schenanigans
    let successMessage = opts.schedule
      ? `Message scheduled to be posted in <#${targetChannel.id}> on ${postAt.format("YYYY-MM-DD [at] HH:mm:ss")} (UTC)`
      : `Message posted in <#${targetChannel.id}>`;

    if (opts.repeat) {
      successMessage += `. Message will be automatically reposted every ${humanizeDuration(opts.repeat)}`;

      if (repeatUntil) {
        successMessage += ` until ${repeatUntil.format("YYYY-MM-DD [at] HH:mm:ss")} (UTC)`;
      } else if (repeatTimes) {
        successMessage += `, ${repeatTimes} times in total`;
      }

      successMessage += ".";
    }

    if (targetChannel.id !== msg.channel.id || opts.schedule || opts.repeat) {
      this.sendSuccessMessage(msg.channel, successMessage);
    }
  }

  /**
   * COMMAND: Post a regular text message as the bot to the specified channel
   */
  @d.command("post", "<channel:channel> [content:string$]", {
    options: [
      {
        name: "enable-mentions",
        type: "bool",
      },
      {
        name: "schedule",
        type: "string",
      },
      {
        name: "repeat",
        type: "delay",
      },
      {
        name: "repeat-until",
        type: "string",
      },
      {
        name: "repeat-times",
        type: "number",
      },
    ],
  })
  @d.permission("can_post")
  async postCmd(
    msg: Message,
    args: {
      channel: Channel;
      content?: string;
      "enable-mentions": boolean;
      schedule?: string;
      repeat?: number;
      "repeat-until"?: string;
      "repeat-times"?: number;
    },
  ) {
    this.actualPostCmd(msg, args.channel, { content: args.content }, args);
  }

  /**
   * COMMAND: Post a message with an embed as the bot to the specified channel
   */
  @d.command("post_embed", "<channel:channel> [maincontent:string$]", {
    options: [
      { name: "title", type: "string" },
      { name: "content", type: "string" },
      { name: "color", type: "string" },
      { name: "schedule", type: "string" },
      { name: "raw", isSwitch: true, shortcut: "r" },
      {
        name: "repeat",
        type: "delay",
      },
      {
        name: "repeat-until",
        type: "string",
      },
      {
        name: "repeat-times",
        type: "number",
      },
    ],
  })
  @d.permission("can_post")
  async postEmbedCmd(
    msg: Message,
    args: {
      channel: Channel;
      title?: string;
      maincontent?: string;
      content?: string;
      color?: string;
      schedule?: string;
      raw?: boolean;
      repeat?: number;
      "repeat-until"?: string;
      "repeat-times"?: number;
    },
  ) {
    const content = args.content || args.maincontent;

    if (!args.title && !content) {
      msg.channel.createMessage(errorMessage("Title or content required"));
      return;
    }

    let color = null;
    if (args.color) {
      const colorMatch = args.color.match(COLOR_MATCH_REGEX);
      if (!colorMatch) {
        msg.channel.createMessage(errorMessage("Invalid color specified, use hex colors"));
        return;
      }

      color = parseInt(colorMatch[1], 16);
    }

    let embed: EmbedBase = {};
    if (args.title) embed.title = args.title;
    if (color) embed.color = color;

    if (content) {
      if (args.raw) {
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          this.sendErrorMessage(msg.channel, "Syntax error in embed JSON");
          return;
        }

        if (!isValidEmbed(parsed)) {
          this.sendErrorMessage(msg.channel, "Embed is not valid");
          return;
        }

        embed = Object.assign({}, embed, parsed);
      } else {
        embed.description = this.formatContent(content);
      }
    }

    this.actualPostCmd(msg, args.channel, { embed }, args);
  }

  /**
   * COMMAND: Edit the specified message posted by the bot
   */
  @d.command("edit", "<messageId:string> <content:string$>")
  @d.permission("can_post")
  async editCmd(msg, args: { messageId: string; content: string }) {
    const savedMessage = await this.savedMessages.find(args.messageId);
    if (!savedMessage) {
      msg.channel.createMessage(errorMessage("Unknown message"));
      return;
    }

    if (savedMessage.user_id !== this.bot.user.id) {
      msg.channel.createMessage(errorMessage("Message wasn't posted by me"));
      return;
    }

    await this.bot.editMessage(savedMessage.channel_id, savedMessage.id, this.formatContent(args.content));
    this.sendSuccessMessage(msg.channel, "Message edited");
  }

  /**
   * COMMAND: Edit the specified message with an embed posted by the bot
   */
  @d.command("edit_embed", "<messageId:string> [maincontent:string$]", {
    options: [
      { name: "title", type: "string" },
      { name: "content", type: "string" },
      { name: "color", type: "string" },
    ],
  })
  @d.permission("can_post")
  async editEmbedCmd(
    msg: Message,
    args: { messageId: string; title?: string; maincontent?: string; content?: string; color?: string },
  ) {
    const savedMessage = await this.savedMessages.find(args.messageId);
    if (!savedMessage) {
      msg.channel.createMessage(errorMessage("Unknown message"));
      return;
    }

    const content = args.content || args.maincontent;

    let color = null;
    if (args.color) {
      const colorMatch = args.color.match(COLOR_MATCH_REGEX);
      if (!colorMatch) {
        msg.channel.createMessage(errorMessage("Invalid color specified, use hex colors"));
        return;
      }

      color = parseInt(colorMatch[1], 16);
    }

    const embed: EmbedBase = savedMessage.data.embeds[0];
    if (args.title) embed.title = args.title;
    if (content) embed.description = this.formatContent(content);
    if (color) embed.color = color;

    await this.bot.editMessage(savedMessage.channel_id, savedMessage.id, { embed });
    await this.sendSuccessMessage(msg.channel, "Embed edited");

    if (args.content) {
      const prefix = this.guildConfig.prefix || "!";
      msg.channel.createMessage(
        trimLines(`
        <@!${msg.author.id}> You can now specify an embed's content directly at the end of the command:
        \`${prefix}edit_embed -title "Some title" content goes here\`
        The \`-content\` option will soon be removed in favor of this.
      `),
      );
    }
  }

  @d.command("scheduled_posts", [], {
    aliases: ["scheduled_posts list"],
  })
  @d.permission("can_post")
  async scheduledPostListCmd(msg: Message) {
    const scheduledPosts = await this.scheduledPosts.all();
    if (scheduledPosts.length === 0) {
      msg.channel.createMessage("No scheduled posts");
      return;
    }

    scheduledPosts.sort(sorter("post_at"));

    let i = 1;
    const postLines = scheduledPosts.map(p => {
      let previewText =
        p.content.content || (p.content.embed && (p.content.embed.description || p.content.embed.title)) || "";

      const isTruncated = previewText.length > SCHEDULED_POST_PREVIEW_TEXT_LENGTH;

      previewText = disableCodeBlocks(deactivateMentions(previewText))
        .replace(/\s+/g, " ")
        .slice(0, SCHEDULED_POST_PREVIEW_TEXT_LENGTH);

      const parts = [`\`#${i++}\` \`[${p.post_at}]\` ${previewText}${isTruncated ? "..." : ""}`];
      if (p.attachments.length) parts.push("*(with attachment)*");
      if (p.content.embed) parts.push("*(embed)*");
      if (p.repeat_until) {
        parts.push(`*(repeated every ${humanizeDuration(p.repeat_interval)} until ${p.repeat_until})*`);
      }
      if (p.repeat_times) {
        parts.push(
          `*(repeated every ${humanizeDuration(p.repeat_interval)}, ${p.repeat_times} more ${
            p.repeat_times === 1 ? "time" : "times"
          })*`,
        );
      }
      parts.push(`*(${p.author_name})*`);

      return parts.join(" ");
    });

    const finalMessage = trimLines(`
      ${postLines.join("\n")}
      
      Use \`scheduled_posts <num>\` to view a scheduled post in full
      Use \`scheduled_posts delete <num>\` to delete a scheduled post
    `);
    createChunkedMessage(msg.channel, finalMessage);
  }

  @d.command("scheduled_posts delete", "<num:number>", {
    aliases: ["scheduled_posts d"],
  })
  @d.permission("can_post")
  async scheduledPostDeleteCmd(msg: Message, args: { num: number }) {
    const scheduledPosts = await this.scheduledPosts.all();
    scheduledPosts.sort(sorter("post_at"));
    const post = scheduledPosts[args.num - 1];
    if (!post) {
      return this.sendErrorMessage(msg.channel, "Scheduled post not found");
    }

    await this.scheduledPosts.delete(post.id);
    this.sendSuccessMessage(msg.channel, "Scheduled post deleted!");
  }

  @d.command("scheduled_posts", "<num:number>", {
    aliases: ["scheduled_posts show"],
  })
  @d.permission("can_post")
  async scheduledPostShowCmd(msg: Message, args: { num: number }) {
    const scheduledPosts = await this.scheduledPosts.all();
    scheduledPosts.sort(sorter("post_at"));
    const post = scheduledPosts[args.num - 1];
    if (!post) {
      return this.sendErrorMessage(msg.channel, "Scheduled post not found");
    }

    this.postMessage(msg.channel as TextChannel, post.content, post.attachments, post.enable_mentions);
  }
}
