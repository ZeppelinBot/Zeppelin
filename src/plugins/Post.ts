import { Plugin, decorators as d } from "knub";
import { Channel, Message, TextChannel } from "eris";
import { errorMessage, downloadFile } from "../utils";
import { GuildSavedMessages } from "../data/GuildSavedMessages";

import fs from "fs";
const fsp = fs.promises;

export class PostPlugin extends Plugin {
  public static pluginName = "post";

  protected savedMessages: GuildSavedMessages;

  onLoad() {
    this.savedMessages = GuildSavedMessages.getInstance(this.guildId);
  }

  getDefaultOptions() {
    return {
      permissions: {
        post: false,
        edit: false
      },

      overrides: [
        {
          level: ">=100",
          permissions: {
            post: true,
            edit: true
          }
        }
      ]
    };
  }

  /**
   * COMMAND: Post a message as the bot to the specified channel
   */
  @d.command("post", "<channel:channel> [content:string$]")
  @d.permission("post")
  async postCmd(msg: Message, args: { channel: Channel; content?: string }) {
    if (!(args.channel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Channel is not a text channel"));
      return;
    }

    const content = args.content || undefined;
    let downloadedAttachment;
    let file;

    if (msg.attachments.length) {
      downloadedAttachment = await downloadFile(msg.attachments[0].url);
      file = {
        name: msg.attachments[0].filename,
        file: await fsp.readFile(downloadedAttachment.path)
      };
    }

    if (content == null && file == null) {
      msg.channel.createMessage(errorMessage("Text content or attachment required"));
      return;
    }

    const createdMsg = await args.channel.createMessage(content, file);
    await this.savedMessages.setPermanent(createdMsg.id);

    if (downloadedAttachment) {
      downloadedAttachment.deleteFn();
    }
  }

  /**
   * Edit the specified message posted by the bot
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

    await this.bot.editMessage(savedMessage.channel_id, savedMessage.id, args.content);
  }
}
