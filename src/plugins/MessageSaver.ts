import { Plugin, decorators as d } from "knub";
import { GuildChannel, Message, TextChannel } from "eris";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { successMessage } from "../utils";

export class MessageSaverPlugin extends Plugin {
  protected savedMessages: GuildSavedMessages;

  getDefaultOptions() {
    return {
      permissions: {
        manage: false
      },

      overrides: [
        {
          level: ">=100",
          permissions: {
            manage: true
          }
        }
      ]
    };
  }

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

  @d.command("save_messages_to_db", "<channel:channel> <ids:string...>")
  @d.permission("manage")
  async saveMessageCmd(msg: Message, args: { channel: GuildChannel & TextChannel; ids: string[] }) {
    await msg.channel.createMessage("Saving specified messages...");

    const failed = [];
    for (const id of args.ids) {
      const savedMessage = await this.savedMessages.find(id);
      if (savedMessage) continue;

      let thisMsg: Message;

      try {
        thisMsg = await args.channel.getMessage(id);

        if (!thisMsg) {
          failed.push(id);
          continue;
        }

        await this.savedMessages.createFromMsg(thisMsg, { is_permanent: true });
      } catch (e) {
        failed.push(id);
      }
    }

    if (failed.length) {
      const savedCount = args.ids.length - failed.length;
      msg.channel.createMessage(
        successMessage(`Saved ${savedCount} messages. The following messages could not be saved: ${failed.join(", ")}`)
      );
    } else {
      msg.channel.createMessage(successMessage(`Saved ${args.ids.length} messages!`));
    }
  }
}
