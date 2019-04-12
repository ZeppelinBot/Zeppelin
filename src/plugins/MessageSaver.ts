import { Plugin, decorators as d, IPluginOptions } from "knub";
import { GuildChannel, Message, TextChannel } from "eris";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { successMessage } from "../utils";

interface IMessageSaverPluginConfig {
  can_manage: boolean;
}

export class MessageSaverPlugin extends Plugin<IMessageSaverPluginConfig> {
  public static pluginName = "message_saver";

  protected savedMessages: GuildSavedMessages;

  getDefaultOptions(): IPluginOptions<IMessageSaverPluginConfig> {
    return {
      config: {
        can_manage: false,
      },

      overrides: [
        {
          level: ">=100",
          config: {
            can_manage: true,
          },
        },
      ],
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

  async saveMessagesToDB(channel: GuildChannel & TextChannel, ids: string[]) {
    const failed = [];
    for (const id of ids) {
      const savedMessage = await this.savedMessages.find(id);
      if (savedMessage) continue;

      let thisMsg: Message;

      try {
        thisMsg = await channel.getMessage(id);

        if (!thisMsg) {
          failed.push(id);
          continue;
        }

        await this.savedMessages.createFromMsg(thisMsg, { is_permanent: true });
      } catch (e) {
        failed.push(id);
      }
    }

    return {
      savedCount: ids.length - failed.length,
      failed,
    };
  }

  @d.command("save_messages_to_db", "<channel:channel> <ids:string...>")
  @d.permission("manage")
  async saveMessageCmd(msg: Message, args: { channel: GuildChannel & TextChannel; ids: string[] }) {
    await msg.channel.createMessage("Saving specified messages...");

    const { savedCount, failed } = await this.saveMessagesToDB(args.channel, args.ids);

    if (failed.length) {
      msg.channel.createMessage(
        successMessage(
          `Saved ${savedCount} messages. The following messages could not be saved: ${failed.join(", ")}
        `,
        ),
      );
    } else {
      msg.channel.createMessage(successMessage(`Saved ${savedCount} messages!`));
    }
  }

  @d.command("save_pins_to_db", "<channel:channel>")
  @d.permission("manage")
  async savePinsCmd(msg: Message, args: { channel: GuildChannel & TextChannel }) {
    await msg.channel.createMessage(`Saving pins from <#${args.channel.id}>...`);

    const pins = await args.channel.getPins();
    const { savedCount, failed } = await this.saveMessagesToDB(args.channel, pins.map(m => m.id));

    if (failed.length) {
      msg.channel.createMessage(
        successMessage(
          `Saved ${savedCount} messages. The following messages could not be saved: ${failed.join(", ")}
        `,
        ),
      );
    } else {
      msg.channel.createMessage(successMessage(`Saved ${savedCount} messages!`));
    }
  }
}
