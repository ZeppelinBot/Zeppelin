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
} from "../utils";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { ZeppelinPlugin } from "./ZeppelinPlugin";

import fs from "fs";
import { GuildScheduledPosts } from "../data/GuildScheduledPosts";
import moment, { Moment } from "moment-timezone";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
const fsp = fs.promises;

const COLOR_MATCH_REGEX = /^#?([0-9a-f]{6})$/;

const SCHEDULED_POST_CHECK_INTERVAL = 15 * SECONDS;
const SCHEDULED_POST_PREVIEW_TEXT_LENGTH = 50;

interface IPostPluginConfig {
  can_post: boolean;
}

export class PostPlugin extends ZeppelinPlugin<IPostPluginConfig> {
  public static pluginName = "post";

  protected savedMessages: GuildSavedMessages;
  protected scheduledPosts: GuildScheduledPosts;
  protected logs: GuildLogs;

  private scheduledPostLoopTimeout;

  onLoad() {
    this.savedMessages = GuildSavedMessages.getInstance(this.guildId);
    this.scheduledPosts = GuildScheduledPosts.getInstance(this.guildId);
    this.logs = new GuildLogs(this.guildId);

    this.scheduledPostLoop();
  }

  onUnload() {
    clearTimeout(this.scheduledPostLoopTimeout);
  }

  getDefaultOptions(): IPluginOptions<IPostPluginConfig> {
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
    const dtMatch = str.match(/^\d{4}-\d{2}-\d{2} \d{1,2}:\d{1,2}(:\d{1,2})?$/);
    if (dtMatch) {
      const dt = moment(str, dtMatch[1] ? "YYYY-MM-DD H:m:s" : "YYYY-MM-DD H:m");
      return dt;
    }

    const tMatch = str.match(/^\d{1,2}:\d{1,2}(:\d{1,2})?$/);
    if (tMatch) {
      const dt = moment(str, tMatch[1] ? "H:m:s" : "H:m");
      if (dt.isBefore(moment())) dt.add(1, "day");
      return dt;
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
            `Failed to post scheduled message to #${channel.name} (${channel.id}) on ${this.guild.name} (${
              this.guildId
            })`,
          );
        }
      }

      await this.scheduledPosts.delete(post.id);
    }

    this.scheduledPostLoopTimeout = setTimeout(() => this.scheduledPostLoop(), SCHEDULED_POST_CHECK_INTERVAL);
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
    ],
  })
  @d.permission("can_post")
  async postCmd(
    msg: Message,
    args: { channel: Channel; content?: string; "enable-mentions": boolean; schedule?: string },
  ) {
    if (!(args.channel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Channel is not a text channel"));
      return;
    }

    if (args.content == null && msg.attachments.length === 0) {
      msg.channel.createMessage(errorMessage("Text content or attachment required"));
      return;
    }

    if (args.schedule) {
      // Schedule the post to be posted later
      const postAt = this.parseScheduleTime(args.schedule);
      if (!postAt) {
        return this.sendErrorMessage(msg.channel, "Invalid schedule time");
      }

      if (postAt < moment()) {
        return this.sendErrorMessage(msg.channel, "Post can't be scheduled to be posted in the past");
      }

      await this.scheduledPosts.create({
        author_id: msg.author.id,
        author_name: `${msg.author.username}#${msg.author.discriminator}`,
        channel_id: args.channel.id,
        content: { content: args.content },
        attachments: msg.attachments,
        post_at: postAt.format(DBDateFormat),
        enable_mentions: args["enable-mentions"],
      });
      this.sendSuccessMessage(
        msg.channel,
        `Message scheduled to be posted in <#${args.channel.id}> on ${postAt.format("YYYY-MM-DD [at] HH:mm:ss")} (UTC)`,
      );
      this.logs.log(LogType.SCHEDULED_MESSAGE, {
        author: stripObjectToScalars(msg.author),
        channel: stripObjectToScalars(args.channel),
        date: postAt.format("YYYY-MM-DD"),
        time: postAt.format("HH:mm:ss"),
      });
    } else {
      // Post the message immediately
      await this.postMessage(args.channel, args.content, msg.attachments, args["enable-mentions"]);
      this.sendSuccessMessage(msg.channel, `Message posted in <#${args.channel.id}>`);
    }
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
    },
  ) {
    if (!(args.channel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Channel is not a text channel"));
      return;
    }

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

    const embed: EmbedBase = {};
    if (args.title) embed.title = args.title;
    if (content) embed.description = this.formatContent(content);
    if (color) embed.color = color;

    if (args.schedule) {
      // Schedule the post to be posted later
      const postAt = this.parseScheduleTime(args.schedule);
      if (!postAt) {
        return this.sendErrorMessage(msg.channel, "Invalid schedule time");
      }

      if (postAt < moment()) {
        return this.sendErrorMessage(msg.channel, "Post can't be scheduled to be posted in the past");
      }

      await this.scheduledPosts.create({
        author_id: msg.author.id,
        author_name: `${msg.author.username}#${msg.author.discriminator}`,
        channel_id: args.channel.id,
        content: { embed },
        attachments: msg.attachments,
        post_at: postAt.format(DBDateFormat),
      });
      await this.sendSuccessMessage(
        msg.channel,
        `Embed scheduled to be posted in <#${args.channel.id}> on ${postAt.format("YYYY-MM-DD [at] HH:mm:ss")} (UTC)`,
      );
      this.logs.log(LogType.SCHEDULED_MESSAGE, {
        author: stripObjectToScalars(msg.author),
        channel: stripObjectToScalars(args.channel),
        date: postAt.format("YYYY-MM-DD"),
        time: postAt.format("HH:mm:ss"),
      });
    } else {
      const createdMsg = await args.channel.createMessage({ embed });
      this.savedMessages.setPermanent(createdMsg.id);

      await this.sendSuccessMessage(msg.channel, `Embed posted in <#${args.channel.id}>`);
    }

    if (args.content) {
      const prefix = this.guildConfig.prefix || "!";
      msg.channel.createMessage(
        trimLines(`
        <@!${msg.author.id}> You can now specify an embed's content directly at the end of the command:
        \`${prefix}post_embed --title="Some title" content goes here\`
        The \`--content\` option will soon be removed in favor of this.
      `),
      );
    }
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
        \`${prefix}edit_embed --title="Some title" content goes here\`
        The \`--content\` option will soon be removed in favor of this.
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
      parts.push(`*(${p.author_name})*`);

      return parts.join(" ");
    });

    const finalMessage = trimLines(`
      ${postLines.join("\n")}
      
      Use \`scheduled_posts show <num>\` to view a scheduled post in full
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
