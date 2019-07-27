import { decorators as d, IPluginOptions } from "knub";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { GuildChannel, Message, TextChannel } from "eris";
import { errorMessage, getUrlsInString, noop, successMessage, tNullable } from "../utils";
import path from "path";
import moment from "moment-timezone";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { SavedMessage } from "../data/entities/SavedMessage";
import * as t from "io-ts";
import { GuildStarboardMessages } from "../data/GuildStarboardMessages";
import { StarboardMessage } from "src/data/entities/StarboardMessage";

const StarboardOpts = t.type({
  source_channel_ids: t.array(t.string),
  starboard_channel_id: t.string,
  positive_emojis: tNullable(t.array(t.string)),
  positive_required: tNullable(t.number),
  allow_multistar: tNullable(t.boolean),
  negative_emojis: tNullable(t.array(t.string)),
  bot_reacts: tNullable(t.boolean),
  enabled: tNullable(t.boolean),
});
type TStarboardOpts = t.TypeOf<typeof StarboardOpts>;

const ConfigSchema = t.type({
  entries: t.record(t.string, StarboardOpts),

  can_manage: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

const defaultStarboardOpts: Partial<TStarboardOpts> = {
  positive_emojis: ["⭐"],
  positive_required: 5,
  allow_multistar: false,
  negative_emojis: [],
  enabled: true,
};

export class StarboardPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "starboard";
  public static showInDocs = false;
  public static configSchema = ConfigSchema;

  protected savedMessages: GuildSavedMessages;
  protected starboardMessages: GuildStarboardMessages;

  private onMessageDeleteFn;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        can_manage: false,
        entries: {},
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

  protected getStarboardOptsForSourceChannelId(sourceChannel): TStarboardOpts[] {
    const config = this.getConfigForChannel(sourceChannel);
    return Object.values(config.entries)
      .filter(opts => opts.source_channel_ids.includes(sourceChannel.id))
      .map(opts => Object.assign({}, defaultStarboardOpts, opts));
  }

  protected getStarboardOptsForStarboardChannelId(starboardChannel): TStarboardOpts[] {
    const config = this.getConfigForChannel(starboardChannel);
    return Object.values(config.entries)
      .filter(opts => opts.starboard_channel_id === starboardChannel.id)
      .map(opts => Object.assign({}, defaultStarboardOpts, opts));
  }

  onLoad() {
    this.savedMessages = GuildSavedMessages.getGuildInstance(this.guildId);
    this.starboardMessages = GuildStarboardMessages.getGuildInstance(this.guildId);

    this.onMessageDeleteFn = this.onMessageDelete.bind(this);
    this.savedMessages.events.on("delete", this.onMessageDeleteFn);
  }

  onUnload() {
    this.savedMessages.events.off("delete", this.onMessageDeleteFn);
  }

  /**
   * When a reaction is added to a message, check if there are any applicable starboards and if the reactions reach
   * the required threshold. If they do, post the message in the starboard channel.
   */
  @d.event("messageReactionAdd")
  @d.lock("starboardReaction")
  async onMessageReactionAdd(msg: Message, emoji: { id: string; name: string }) {
    if (!msg.author) {
      // Message is not cached, fetch it
      try {
        msg = await msg.channel.getMessage(msg.id);
      } catch (e) {
        // Sometimes we get this event for messages we can't fetch with getMessage; ignore silently
        return;
      }
    }

    const applicableStarboards = await this.getStarboardOptsForSourceChannelId(msg.channel);

    for (const starboard of applicableStarboards) {
      // Instantly continue if the starboard is disabled
      if (!starboard.enabled) continue;
      // Can't star messages in the starboard channel itself
      if (msg.channel.id === starboard.starboard_channel_id) continue;
      // If the message has already been posted to this starboard, we don't need to do anything else here
      const starboardMessages = await this.starboardMessages.getMessagesForStarboardIdAndSourceMessageId(
        starboard.starboard_channel_id,
        msg.id,
      );
      if (starboardMessages.length > 0) continue;

      const reactionsCount = await this.countReactions(msg, starboard.positive_emojis, starboard.allow_multistar);
      if (reactionsCount >= starboard.positive_required) {
        await this.saveMessageToStarboard(msg, starboard.starboard_channel_id);
      }
    }
  }

  /**
   * Tallys the reaction count of ALL reactions in the array
   */
  async countReactions(msg: Message, counted: string[], countDouble: boolean) {
    let totalCount = [];
    countDouble = countDouble || false;

    for (const emoji of counted) {
      totalCount = await this.countReactionsForEmoji(msg, emoji, totalCount, countDouble);
    }

    return totalCount.length;
  }

  /**
   * Counts the emoji specific reactions in the message, ignoring the message author and the bot
   */
  async countReactionsForEmoji(msg: Message, reaction, usersAlreadyCounted: string[], countDouble: boolean) {
    countDouble = countDouble || false;

    // Ignore self-stars, bot-stars and multi-stars
    const reactors = await msg.getReaction(reaction);
    for (const user of reactors) {
      if (user.id === msg.author.id) continue;
      if (user.id === this.bot.user.id) continue;
      if (!countDouble && usersAlreadyCounted.includes(user.id)) continue;
      usersAlreadyCounted.push(user.id);
    }

    return usersAlreadyCounted;
  }

  /**
   * Saves/posts a message to the specified starboard. The message is posted as an embed and image attachments are
   * included as the embed image.
   */
  async saveMessageToStarboard(msg: Message, starboardChannelId: string) {
    const channel = this.guild.channels.get(starboardChannelId);
    if (!channel) return;

    const time = moment(msg.timestamp, "x").format("YYYY-MM-DD [at] HH:mm:ss [UTC]");

    const embed: any = {
      footer: {
        text: `#${(msg.channel as GuildChannel).name} - ${time}`,
      },
      author: {
        name: `${msg.author.username}#${msg.author.discriminator}`,
      },
    };

    if (msg.author.avatarURL) {
      embed.author.icon_url = msg.author.avatarURL;
    }

    if (msg.content) {
      embed.description = msg.content;
    }

    if (msg.attachments.length) {
      const attachment = msg.attachments[0];
      const ext = path
        .extname(attachment.filename)
        .slice(1)
        .toLowerCase();
      if (["jpeg", "jpg", "png", "gif", "webp"].includes(ext)) {
        embed.image = { url: attachment.url };
      }
    } else if (msg.content) {
      const links = getUrlsInString(msg.content);
      for (const link of links) {
        const parts = link
          .toString()
          .replace(/\/$/, "")
          .split(".");
        const ext = parts[parts.length - 1].toLowerCase();

        if (
          (link.hostname === "i.imgur.com" || link.hostname === "cdn.discordapp.com") &&
          ["jpeg", "jpg", "png", "gif", "webp"].includes(ext)
        ) {
          embed.image = { url: link.toString() };
          break;
        }
      }
    }

    const starboardMessage = await (channel as TextChannel).createMessage({
      content: `https://discordapp.com/channels/${this.guildId}/${msg.channel.id}/${msg.id}`,
      embed,
    });
    await this.starboardMessages.createStarboardMessage(channel.id, msg.id, starboardMessage.id);
  }

  /**
   * Remove a message from the specified starboard
   */
  async removeMessageFromStarboard(msg: StarboardMessage) {
    await this.bot.deleteMessage(msg.starboard_channel_id, msg.starboard_message_id).catch(noop);
  }

  async removeMessageFromStarboardMessages(starboard_message_id: string, starboard_channel_id: string) {
    await this.starboardMessages.deleteStarboardMessage(starboard_message_id, starboard_channel_id);
  }

  /**
   * When a message is deleted, also delete it from any starboards it's been posted in.
   * This function is called in response to GuildSavedMessages events.
   * TODO: When a message is removed from the starboard itself, i.e. the bot's embed is removed, also remove that message from the starboard_messages database table
   */
  async onMessageDelete(msg: SavedMessage) {
    let messages = await this.starboardMessages.getStarboardMessagesForMessageId(msg.id);
    if (messages.length > 0) {
      for (const starboardMessage of messages) {
        if (!starboardMessage.starboard_message_id) continue;
        this.removeMessageFromStarboard(starboardMessage);
      }
    } else {
      messages = await this.starboardMessages.getStarboardMessagesForStarboardMessageId(msg.id);
      if (messages.length === 0) return;

      for (const starboardMessage of messages) {
        if (!starboardMessage.starboard_channel_id) continue;
        this.removeMessageFromStarboardMessages(
          starboardMessage.starboard_message_id,
          starboardMessage.starboard_channel_id,
        );
      }
    }
  }

  @d.command("starboard migrate_pins", "<pinChannelId:channelId> <starboardChannelId:channelId>")
  async migratePinsCmd(msg: Message, args: { pinChannelId: string; starboardChannelId }) {
    try {
      const starboards = await this.getStarboardOptsForStarboardChannelId(this.bot.getChannel(args.starboardChannelId));
      if (!starboards) {
        msg.channel.createMessage(errorMessage("The specified channel doesn't have a starboard!"));
        return;
      }

      const channel = (await this.guild.channels.get(args.pinChannelId)) as GuildChannel & TextChannel;
      if (!channel) {
        msg.channel.createMessage(errorMessage("Could not find the specified channel to migrate pins from!"));
        return;
      }

      msg.channel.createMessage(`Migrating pins from <#${channel.id}> to <#${args.starboardChannelId}>...`);

      const pins = await channel.getPins();
      pins.reverse(); // Migrate pins starting from the oldest message

      for (const pin of pins) {
        const existingStarboardMessage = await this.starboardMessages.getMessagesForStarboardIdAndSourceMessageId(
          args.starboardChannelId,
          pin.id,
        );
        if (existingStarboardMessage.length > 0) continue;
        await this.saveMessageToStarboard(pin, args.starboardChannelId);
      }

      msg.channel.createMessage(successMessage("Pins migrated!"));
    } catch (error) {
      this.sendErrorMessage(
        msg.channel,
        "Sorry, but something went wrong!\nSyntax: `starboard migrate_pins <sourceChannelId> <starboardChannelid>`",
      );
    }
  }
}
