import { decorators as d, IBasePluginConfig, IPluginOptions } from "knub";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { SavedMessage } from "../data/entities/SavedMessage";
import { GuildAutoReactions } from "../data/GuildAutoReactions";
import { Message } from "eris";
import { customEmojiRegex, errorMessage, isEmoji, successMessage } from "../utils";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import * as t from "io-ts";

const ConfigSchema = t.type({
  can_manage: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export class AutoReactionsPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "auto_reactions";
  protected static configSchema = ConfigSchema;

  protected savedMessages: GuildSavedMessages;
  protected autoReactions: GuildAutoReactions;

  private onMessageCreateFn;

  protected static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
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
    this.savedMessages = GuildSavedMessages.getGuildInstance(this.guildId);
    this.autoReactions = GuildAutoReactions.getGuildInstance(this.guildId);

    this.onMessageCreateFn = this.savedMessages.events.on("create", this.onMessageCreate.bind(this));
  }

  onUnload() {
    this.savedMessages.events.off("create", this.onMessageCreateFn);
  }

  @d.command("auto_reactions", "<channelId:channelId> <reactions...>")
  @d.permission("can_manage")
  async setAutoReactionsCmd(msg: Message, args: { channelId: string; reactions: string[] }) {
    const finalReactions = [];

    for (const reaction of args.reactions) {
      if (!isEmoji(reaction)) {
        msg.channel.createMessage(errorMessage("One or more of the specified reactions were invalid!"));
        return;
      }

      let savedValue;

      const customEmojiMatch = reaction.match(customEmojiRegex);
      if (customEmojiMatch) {
        // Custom emoji
        if (!this.canUseEmoji(customEmojiMatch[2])) {
          msg.channel.createMessage(errorMessage("I can only use regular emojis and custom emojis from this server"));
          return;
        }

        savedValue = `${customEmojiMatch[1]}:${customEmojiMatch[2]}`;
      } else {
        // Unicode emoji
        savedValue = reaction;
      }

      finalReactions.push(savedValue);
    }

    await this.autoReactions.set(args.channelId, finalReactions);
    msg.channel.createMessage(successMessage(`Auto-reactions set for <#${args.channelId}>`));
  }

  @d.command("auto_reactions disable", "<channelId:channelId>")
  @d.permission("can_manage")
  async disableAutoReactionsCmd(msg: Message, args: { channelId: string }) {
    const autoReaction = await this.autoReactions.getForChannel(args.channelId);
    if (!autoReaction) {
      msg.channel.createMessage(errorMessage(`Auto-reactions aren't enabled in <#${args.channelId}>`));
      return;
    }

    await this.autoReactions.removeFromChannel(args.channelId);
    msg.channel.createMessage(successMessage(`Auto-reactions disabled in <#${args.channelId}>`));
  }

  async onMessageCreate(msg: SavedMessage) {
    const autoReaction = await this.autoReactions.getForChannel(msg.channel_id);
    if (!autoReaction) return;

    const realMsg = await this.bot.getMessage(msg.channel_id, msg.id);
    if (!realMsg) return;

    for (const reaction of autoReaction.reactions) {
      realMsg.addReaction(reaction);
    }
  }
}
