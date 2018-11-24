import { Plugin, decorators as d } from "knub";
import { Channel, Message, TextChannel } from "eris";
import { errorMessage } from "../utils";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { ISavedMessageData } from "../data/entities/SavedMessage";

export class PostPlugin extends Plugin {
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
   * Post a message as the bot to the specified channel
   */
  @d.command("post", "<channel:channel> <content:string$>")
  @d.permission("post")
  async postCmd(msg: Message, args: { channel: Channel; content: string }) {
    if (!(args.channel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Channel is not a text channel"));
      return;
    }

    const createdMsg = await args.channel.createMessage(args.content);
    await this.savedMessages.createFromMsg(createdMsg, { is_permanent: true });
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

    const edited = await message.edit(args.content);
    await this.savedMessages.saveEditFromMsg(edited);
  }
}
