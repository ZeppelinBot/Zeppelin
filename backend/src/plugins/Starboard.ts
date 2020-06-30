import { decorators as d, IPluginOptions } from "knub";
import { ZeppelinPluginClass, trimPluginDescription } from "./ZeppelinPluginClass";
import { Embed, EmbedBase, GuildChannel, Message, TextChannel } from "eris";
import {
  errorMessage,
  getUrlsInString,
  messageLink,
  noop,
  successMessage,
  TDeepPartialProps,
  tNullable,
  tDeepPartial,
  UnknownUser,
  EMPTY_CHAR,
} from "../utils";
import path from "path";
import moment from "moment-timezone";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { SavedMessage } from "../data/entities/SavedMessage";
import * as t from "io-ts";
import { GuildStarboardMessages } from "../data/GuildStarboardMessages";
import { StarboardMessage } from "../data/entities/StarboardMessage";
import { GuildStarboardReactions } from "../data/GuildStarboardReactions";

const StarboardOpts = t.type({
  channel_id: t.string,
  stars_required: t.number,
  star_emoji: tNullable(t.array(t.string)),
  enabled: tNullable(t.boolean),
});
type TStarboardOpts = t.TypeOf<typeof StarboardOpts>;

const ConfigSchema = t.type({
  boards: t.record(t.string, StarboardOpts),
  can_migrate: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

const PartialConfigSchema = tDeepPartial(ConfigSchema);

const defaultStarboardOpts: Partial<TStarboardOpts> = {
  star_emoji: ["⭐"],
  enabled: true,
};

export class StarboardPlugin extends ZeppelinPluginClass<TConfigSchema> {
  public static pluginName = "starboard";
  public static configSchema = ConfigSchema;

  public static pluginInfo = {
    prettyName: "Starboard",
    description: trimPluginDescription(`
      This plugin allows you to set up starboards on your server. Starboards are like user voted pins where messages with enough reactions get immortalized on a "starboard" channel.
    `),
    configurationGuide: trimPluginDescription(`
      ### Note on emojis
      To specify emoji in the config, you need to use the emoji's "raw form".
      To obtain this, post the emoji with a backslash in front of it.
      
      - Example with a default emoji: "\:star:" => "⭐"
      - Example with a custom emoji: "\:mrvnSmile:" => "<:mrvnSmile:543000534102310933>"

      ### Basic starboard
      Any message on the server that gets 5 star reactions will be posted into the starboard channel (604342689038729226).
      
      ~~~yml
      starboard:
        config:
          boards:
            basic:
              channel_id: "604342689038729226"
              stars_required: 5
      ~~~
      
      ### Custom star emoji
      This is identical to the basic starboard above, but accepts two emoji: the regular star and a custom :mrvnSmile: emoji
      
      ~~~yml
      starboard:
        config:
          boards:
            basic:
              channel_id: "604342689038729226"
              star_emoji: ["⭐", "<:mrvnSmile:543000534102310933>"]
              stars_required: 5
      ~~~
      
      ### Limit starboard to a specific channel
      This is identical to the basic starboard above, but only works from a specific channel (473087035574321152).
      
      ~~~yml
      starboard:
        config:
          boards:
            basic:
              enabled: false # The starboard starts disabled and is then enabled in a channel override below
              channel_id: "604342689038729226"
              stars_required: 5
        overrides:
          - channel: "473087035574321152"
            config:
              boards:
                basic:
                  enabled: true
      ~~~
    `),
  };

  protected savedMessages: GuildSavedMessages;
  protected starboardMessages: GuildStarboardMessages;
  protected starboardReactions: GuildStarboardReactions;

  private onMessageDeleteFn;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        can_migrate: false,
        boards: {},
      },

      overrides: [
        {
          level: ">=100",
          config: {
            can_migrate: true,
          },
        },
      ],
    };
  }

  protected static preprocessStaticConfig(config: t.TypeOf<typeof PartialConfigSchema>) {
    if (config.boards) {
      for (const [name, opts] of Object.entries(config.boards)) {
        config.boards[name] = Object.assign({}, defaultStarboardOpts, config.boards[name]);
      }
    }

    return config;
  }

  protected getStarboardOptsForStarboardChannel(starboardChannel): TStarboardOpts[] {
    const config = this.getConfigForChannel(starboardChannel);

    const configs = Object.values(config.boards).filter(opts => opts.channel_id === starboardChannel.id);
    configs.forEach(cfg => {
      if (cfg.enabled == null) cfg.enabled = defaultStarboardOpts.enabled;
      if (cfg.star_emoji == null) cfg.star_emoji = defaultStarboardOpts.star_emoji;
      if (cfg.stars_required == null) cfg.stars_required = defaultStarboardOpts.stars_required;
    });

    return configs;
  }

  onLoad() {
    this.savedMessages = GuildSavedMessages.getGuildInstance(this.guildId);
    this.starboardMessages = GuildStarboardMessages.getGuildInstance(this.guildId);
    this.starboardReactions = GuildStarboardReactions.getGuildInstance(this.guildId);

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
  async onMessageReactionAdd(msg: Message, emoji: { id: string; name: string }, userId: string) {
    if (!msg.author) {
      // Message is not cached, fetch it
      try {
        msg = await msg.channel.getMessage(msg.id);
      } catch (e) {
        // Sometimes we get this event for messages we can't fetch with getMessage; ignore silently
        return;
      }
    }

    // No self-votes!
    if (msg.author.id === userId) return;

    const user = await this.resolveUser(userId);
    if (user instanceof UnknownUser) return;
    if (user.bot) return;

    const config = this.getConfigForMemberIdAndChannelId(userId, msg.channel.id);
    const applicableStarboards = Object.values(config.boards)
      .filter(board => board.enabled)
      // Can't star messages in the starboard channel itself
      .filter(board => board.channel_id !== msg.channel.id)
      // Matching emoji
      .filter(board => {
        return board.star_emoji.some((boardEmoji: string) => {
          if (emoji.id) {
            // Custom emoji
            const customEmojiMatch = boardEmoji.match(/^<?:.+?:(\d+)>?$/);
            if (customEmojiMatch) {
              return customEmojiMatch[1] === emoji.id;
            }

            return boardEmoji === emoji.id;
          } else {
            // Unicode emoji
            return emoji.name === boardEmoji;
          }
        });
      });

    for (const starboard of applicableStarboards) {
      // Save reaction into the database
      await this.starboardReactions.createStarboardReaction(msg.id, userId).catch(noop);

      // If the message has already been posted to this starboard, we don't need to do anything else
      const starboardMessages = await this.starboardMessages.getMatchingStarboardMessages(starboard.channel_id, msg.id);
      if (starboardMessages.length > 0) continue;

      const reactions = await this.starboardReactions.getAllReactionsForMessageId(msg.id);
      const reactionsCount = reactions.length;
      if (reactionsCount >= starboard.stars_required) {
        await this.saveMessageToStarboard(msg, starboard.channel_id);
      }
    }
  }

  @d.event("messageReactionRemove")
  async onStarboardReactionRemove(msg: Message, emoji: { id: string; name: string }, userId: string) {
    await this.starboardReactions.deleteStarboardReaction(msg.id, userId);
  }

  @d.event("messageReactionRemoveAll")
  async onMessageReactionRemoveAll(msg: Message) {
    await this.starboardReactions.deleteAllStarboardReactionsForMessageId(msg.id);
  }

  /**
   * Saves/posts a message to the specified starboard.
   * The message is posted as an embed and image attachments are included as the embed image.
   */
  async saveMessageToStarboard(msg: Message, starboardChannelId: string) {
    const channel = this.guild.channels.get(starboardChannelId);
    if (!channel) return;

    const time = moment(msg.timestamp, "x").format("YYYY-MM-DD [at] HH:mm:ss [UTC]");

    const embed: EmbedBase = {
      footer: {
        text: `#${(msg.channel as GuildChannel).name}`,
      },
      author: {
        name: `${msg.author.username}#${msg.author.discriminator}`,
      },
      timestamp: new Date(msg.timestamp).toISOString(),
    };

    if (msg.author.avatarURL) {
      embed.author.icon_url = msg.author.avatarURL;
    }

    if (msg.content) {
      embed.description = msg.content;
    }

    // Include attachments
    if (msg.attachments.length) {
      const attachment = msg.attachments[0];
      const ext = path
        .extname(attachment.filename)
        .slice(1)
        .toLowerCase();
      if (["jpeg", "jpg", "png", "gif", "webp"].includes(ext)) {
        embed.image = { url: attachment.url };
      }
    }

    // Include any embed images in the original message
    if (msg.embeds.length && msg.embeds[0].image) {
      embed.image = msg.embeds[0].image;
    }

    embed.fields = [{ name: EMPTY_CHAR, value: `[Jump to message](${messageLink(msg)})` }];

    const starboardMessage = await (channel as TextChannel).createMessage({ embed });
    await this.starboardMessages.createStarboardMessage(channel.id, msg.id, starboardMessage.id);
  }

  /**
   * Remove a message from the specified starboard
   */
  async removeMessageFromStarboard(msg: StarboardMessage) {
    await this.bot.deleteMessage(msg.starboard_channel_id, msg.starboard_message_id).catch(noop);
  }

  async removeMessageFromStarboardMessages(starboard_message_id: string, channel_id: string) {
    await this.starboardMessages.deleteStarboardMessage(starboard_message_id, channel_id);
  }

  /**
   * When a message is deleted, also delete it from any starboards it's been posted in.
   * Likewise, if a starboard message (i.e. the bot message in the starboard) is deleted, remove it from the database.
   * This function is called in response to GuildSavedMessages events.
   */
  async onMessageDelete(msg: SavedMessage) {
    // Deleted source message
    const starboardMessages = await this.starboardMessages.getStarboardMessagesForMessageId(msg.id);
    for (const starboardMessage of starboardMessages) {
      this.removeMessageFromStarboard(starboardMessage);
    }

    // Deleted message from the starboard
    const deletedStarboardMessages = await this.starboardMessages.getStarboardMessagesForStarboardMessageId(msg.id);
    if (deletedStarboardMessages.length === 0) return;

    for (const starboardMessage of deletedStarboardMessages) {
      this.removeMessageFromStarboardMessages(
        starboardMessage.starboard_message_id,
        starboardMessage.starboard_channel_id,
      );
    }
  }

  @d.command("starboard migrate_pins", "<pinChannel:channel> <starboardName:string>", {
    extra: {
      info: {
        description:
          "Posts all pins from a channel to the specified starboard. The pins are NOT unpinned automatically.",
      },
    },
  })
  @d.permission("can_migrate")
  async migratePinsCmd(msg: Message, args: { pinChannel: GuildChannel; starboardName: string }) {
    const config = await this.getConfig();
    const starboard = config.boards[args.starboardName];
    if (!starboard) {
      this.sendErrorMessage(msg.channel, "Unknown starboard specified");
      return;
    }

    if (!(args.pinChannel instanceof TextChannel)) {
      this.sendErrorMessage(msg.channel, "Unknown/invalid pin channel id");
      return;
    }

    const starboardChannel = this.guild.channels.get(starboard.channel_id);
    if (!starboardChannel || !(starboardChannel instanceof TextChannel)) {
      this.sendErrorMessage(msg.channel, "Starboard has an unknown/invalid channel id");
      return;
    }

    msg.channel.createMessage(`Migrating pins from <#${args.pinChannel.id}> to <#${starboardChannel.id}>...`);

    const pins = await args.pinChannel.getPins();
    pins.reverse(); // Migrate pins starting from the oldest message

    for (const pin of pins) {
      const existingStarboardMessage = await this.starboardMessages.getMatchingStarboardMessages(
        starboardChannel.id,
        pin.id,
      );
      if (existingStarboardMessage.length > 0) continue;
      await this.saveMessageToStarboard(pin, starboardChannel.id);
    }

    this.sendSuccessMessage(msg.channel, `Pins migrated from <#${args.pinChannel.id}> to <#${starboardChannel.id}>!`);
  }
}
