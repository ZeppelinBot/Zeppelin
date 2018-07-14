import { Plugin, decorators as d } from "knub";
import { Channel, Message, TextChannel } from "eris";
import { errorMessage } from "../utils";

export class PostPlugin extends Plugin {
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
   * Post a message as the bot to the specified channel
   */
  @d.command("post", "<channel:channel> <content:string$>")
  @d.permission("post")
  async postCmd(msg: Message, args: { channel: Channel; content: string }) {
    if (!(args.channel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Channel is not a text channel"));
      return;
    }

    args.channel.createMessage(args.content);
  }

  /**
   * Edit the specified message posted by the bot
   */
  @d.command("edit", "<channel:channel> <messageId:string> <content:string$>")
  @d.permission("edit")
  async editCmd(msg, args) {
    const message = await this.bot.getMessage(args.channel.id, args.messageId);

    if (!message) {
      args.channel.createMessage(errorMessage("Unknown message"));
      return;
    }

    if (message.author.id !== this.bot.user.id) {
      args.channel.createMessage(errorMessage("Message wasn't posted by me"));
      return;
    }

    message.edit(args.content);
  }
}
