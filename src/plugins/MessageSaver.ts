import { Plugin, decorators as d } from "knub";
import { Message } from "eris";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { ISavedMessageData } from "../data/entities/SavedMessage";
import moment from "moment-timezone";

export class MessageSaverPlugin extends Plugin {
  protected messages: GuildSavedMessages;

  onLoad() {
    this.messages = GuildSavedMessages.getInstance(this.guildId);
  }

  protected msgToSavedMessageData(msg: Message): ISavedMessageData {
    return {
      attachments: msg.attachments,
      author: {
        username: msg.author.username,
        discriminator: msg.author.discriminator
      },
      content: msg.content,
      embeds: msg.embeds
    };
  }

  @d.event("messageCreate", "guild", false)
  async onMessageCreate(msg: Message) {
    // Only save regular chat messages
    if (msg.type !== 0) {
      return;
    }

    const data: ISavedMessageData = this.msgToSavedMessageData(msg);
    const postedAt = moment.utc(msg.timestamp, "x").format("YYYY-MM-DD HH:mm:ss.SSS");

    await this.messages.create({
      id: msg.id,
      channel_id: msg.channel.id,
      user_id: msg.author.id,
      is_bot: msg.author.bot,
      data,
      posted_at: postedAt
    });
  }

  @d.event("messageDelete", "guild", false)
  async onMessageDelete(msg: Message) {
    const savedMessage = await this.messages.find(msg.id);
    if (!savedMessage) return;

    await this.messages.markAsDeleted(msg.id);
  }

  @d.event("messageUpdate", "guild", false)
  async onMessageUpdate(msg: Message) {
    const savedMessage = await this.messages.find(msg.id);
    if (!savedMessage) return;

    const newData = this.msgToSavedMessageData(msg);

    await this.messages.edit(msg.id, newData);
  }
}
