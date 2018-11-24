import { Plugin, decorators as d } from "knub";
import { Message } from "eris";
import { GuildSavedMessages } from "../data/GuildSavedMessages";

export class MessageSaverPlugin extends Plugin {
  protected savedMessages: GuildSavedMessages;

  onLoad() {
    this.savedMessages = GuildSavedMessages.getInstance(this.guildId);
  }

  @d.event("messageCreate", "guild", false)
  async onMessageCreate(msg: Message) {
    // Only save regular chat messages
    if (msg.type !== 0) {
      return;
    }

    await this.savedMessages.createFromMsg(msg);
  }

  @d.event("messageDelete", "guild", false)
  async onMessageDelete(msg: Message) {
    if (msg.type != null && msg.type !== 0) {
      return;
    }

    await this.savedMessages.markAsDeleted(msg.id);
  }

  @d.event("messageUpdate", "guild", false)
  async onMessageUpdate(msg: Message) {
    if (msg.type !== 0) {
      return;
    }

    await this.savedMessages.saveEditFromMsg(msg);
  }

  @d.event("messageDeleteBulk", "guild", false)
  async onMessageBulkDelete(messages: Message[]) {
    const ids = messages.map(m => m.id);
    await this.savedMessages.markBulkAsDeleted(ids);
  }
}
