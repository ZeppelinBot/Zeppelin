import { Plugin, decorators as d, IBasePluginConfig, IPluginOptions } from "knub";
import { Channel, EmbedBase, Message, Role, TextChannel } from "eris";
import { errorMessage, downloadFile, getRoleMentions } from "../utils";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { ZeppelinPlugin } from "./ZeppelinPlugin";

import fs from "fs";
const fsp = fs.promises;

const COLOR_MATCH_REGEX = /^#?([0-9a-f]{6})$/;

interface IPostPluginPermissions {
  post: boolean;
  edit: boolean;
}

export class PostPlugin extends ZeppelinPlugin<IBasePluginConfig, IPostPluginPermissions> {
  public static pluginName = "post";

  protected savedMessages: GuildSavedMessages;

  onLoad() {
    this.savedMessages = GuildSavedMessages.getInstance(this.guildId);
  }

  getDefaultOptions(): IPluginOptions<IBasePluginConfig, IPostPluginPermissions> {
    return {
      config: {},

      permissions: {
        post: false,
        edit: false,
      },

      overrides: [
        {
          level: ">=100",
          permissions: {
            post: true,
            edit: true,
          },
        },
      ],
    };
  }

  protected formatContent(str) {
    return str.replace(/\\n/g, "\n");
  }

  /**
   * COMMAND: Post a message as the bot to the specified channel
   */
  @d.command("post", "<channel:channel> [content:string$]", {
    options: [
      {
        name: "enable-mentions",
        type: "bool",
      },
    ],
  })
  @d.permission("post")
  async postCmd(msg: Message, args: { channel: Channel; content?: string; "enable-mentions": boolean }) {
    if (!(args.channel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Channel is not a text channel"));
      return;
    }

    const content: string = (args.content && this.formatContent(args.content)) || undefined;
    let downloadedAttachment;
    let file;

    if (msg.attachments.length) {
      downloadedAttachment = await downloadFile(msg.attachments[0].url);
      file = {
        name: msg.attachments[0].filename,
        file: await fsp.readFile(downloadedAttachment.path),
      };
    }

    if (content == null && file == null) {
      msg.channel.createMessage(errorMessage("Text content or attachment required"));
      return;
    }

    const rolesMadeMentionable: Role[] = [];
    if (args["enable-mentions"] && content) {
      const mentionedRoleIds = getRoleMentions(content);
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

    const createdMsg = await args.channel.createMessage(content, file);
    await this.savedMessages.setPermanent(createdMsg.id);

    for (const role of rolesMadeMentionable) {
      role.edit({
        mentionable: false,
      });
    }

    if (downloadedAttachment) {
      downloadedAttachment.deleteFn();
    }
  }

  /**
   * COMMAND: Post a message with an embed as the bot to the specified channel
   */
  @d.command("post_embed", "<channel:channel>", {
    options: [
      { name: "title", type: "string" },
      { name: "content", type: "string" },
      { name: "color", type: "string" },
    ],
  })
  @d.permission("post")
  async postEmbedCmd(msg: Message, args: { channel: Channel; title?: string; content?: string; color?: string }) {
    if (!(args.channel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Channel is not a text channel"));
      return;
    }

    if (!args.title && !args.content) {
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
    if (args.content) embed.description = this.formatContent(args.content);
    if (color) embed.color = color;

    const createdMsg = await args.channel.createMessage({ embed });
    await this.savedMessages.setPermanent(createdMsg.id);
  }

  /**
   * COMMAND: Edit the specified message posted by the bot
   */
  @d.command("edit", "<messageId:string> <content:string$>")
  @d.permission("edit")
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
  }

  /**
   * COMMAND: Edit the specified message with an embed posted by the bot
   */
  @d.command("edit_embed", "<messageId:string>", {
    options: [
      { name: "title", type: "string" },
      { name: "content", type: "string" },
      { name: "color", type: "string" },
    ],
  })
  @d.permission("edit")
  async editEmbedCmd(msg: Message, args: { messageId: string; title?: string; content?: string; color?: string }) {
    const savedMessage = await this.savedMessages.find(args.messageId);
    if (!savedMessage) {
      msg.channel.createMessage(errorMessage("Unknown message"));
      return;
    }

    if (!args.title && !args.content) {
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

    const embed: EmbedBase = savedMessage.data.embeds[0];
    if (args.title) embed.title = args.title;
    if (args.content) embed.description = this.formatContent(args.content);
    if (color) embed.color = color;

    await this.bot.editMessage(savedMessage.channel_id, savedMessage.id, { embed });
  }
}
