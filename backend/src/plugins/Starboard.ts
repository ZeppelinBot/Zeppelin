import { decorators as d, IPluginOptions } from "knub";
import { ZeppelinPlugin, trimPluginDescription } from "./ZeppelinPlugin";
import { GuildChannel, Message, TextChannel } from "eris";
import { errorMessage, getUrlsInString, noop, successMessage, tNullable } from "../utils";
import path from "path";
import moment from "moment-timezone";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { SavedMessage } from "../data/entities/SavedMessage";
import * as t from "io-ts";
import { GuildStarboardMessages } from "../data/GuildStarboardMessages";
import { StarboardMessage } from "../data/entities/StarboardMessage";
import { GuildStarboardReactions } from "../data/GuildStarboardReactions";

const StarboardOpts = t.type({
  source_channel_ids: t.array(t.string),
  starboard_channel_id: t.string,
  positive_emojis: tNullable(t.array(t.string)),
  positive_required: tNullable(t.number),
  enabled: tNullable(t.boolean),
});
type TStarboardOpts = t.TypeOf<typeof StarboardOpts>;

const ConfigSchema = t.type({
  entries: t.record(t.string, StarboardOpts),

  can_migrate: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

const defaultStarboardOpts: Partial<TStarboardOpts> = {
  positive_emojis: ["⭐"],
  positive_required: 5,
  enabled: true,
};

export class StarboardPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "starboard";
  public static showInDocs = false;
  public static configSchema = ConfigSchema;

  public static pluginInfo = {
    prettyName: "Starboards",
    description: trimPluginDescription(`
      This plugin contains all functionality needed to use discord channels as starboards.
    `),
    configurationGuide: trimPluginDescription(`
      You can customize multiple settings for starboards.
      Any emoji that you want available needs to be put into the config in its raw form.
      To obtain a raw form of an emoji, please write out the emoji and put a backslash in front of it.
      Example with default emoji: "\:star:" => "⭐"
      Example with custom emoji: "\:mrvnSmile:" => "<:mrvnSmile:543000534102310933>"
      Now, past the result into the config, but make sure to exclude all less-than and greater-than signs like in the second example.


      ### Starboard with one source channel
      All messages in the source channel that get enough positive reactions will be posted into the starboard channel.
      The only positive reaction counted here is the default emoji "⭐".
      Only users with a role matching the allowed_roles role-id will be counted.
      
      ~~~yml
      starboard:
        config:
          entries:
            exampleOne:
              source_channel_ids: ["604342623569707010"]
              starboard_channel_id: "604342689038729226"
              positive_emojis: ["⭐"]
              positive_required: 5
              allowed_roles: ["556110793058287637"]
              enabled: true
      ~~~
      
      ### Starboard with two sources and two emoji
      All messages in any of the source channels that get enough positive reactions will be posted into the starboard channel.
      Both the default emoji "⭐" and the custom emoji ":mrvnSmile:543000534102310933" are counted.
      
      ~~~yml
      starboard:
        config:
          entries:
            exampleTwo:
              source_channel_ids: ["604342623569707010", "604342649251561487"]
              starboard_channel_id: "604342689038729226"
              positive_emojis: ["⭐", ":mrvnSmile:543000534102310933"]
              positive_required: 10
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
        entries: {},
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

  protected getStarboardOptsForSourceChannel(sourceChannel): TStarboardOpts[] {
    const config = this.getConfigForChannel(sourceChannel);

    const configs = Object.values(config.entries).filter(opts => opts.source_channel_ids.includes(sourceChannel.id));
    configs.forEach(cfg => {
      if (cfg.enabled == null) cfg.enabled = defaultStarboardOpts.enabled;
      if (cfg.positive_emojis == null) cfg.positive_emojis = defaultStarboardOpts.positive_emojis;
      if (cfg.positive_required == null) cfg.positive_required = defaultStarboardOpts.positive_required;
    });

    return configs;
  }

  protected getStarboardOptsForStarboardChannel(starboardChannel): TStarboardOpts[] {
    const config = this.getConfigForChannel(starboardChannel);

    const configs = Object.values(config.entries).filter(opts => opts.starboard_channel_id === starboardChannel.id);
    configs.forEach(cfg => {
      if (cfg.enabled == null) cfg.enabled = defaultStarboardOpts.enabled;
      if (cfg.positive_emojis == null) cfg.positive_emojis = defaultStarboardOpts.positive_emojis;
      if (cfg.positive_required == null) cfg.positive_required = defaultStarboardOpts.positive_required;
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

    const applicableStarboards = await this.getStarboardOptsForSourceChannel(msg.channel);

    for (const starboard of applicableStarboards) {
      // Instantly continue if the starboard is disabled
      if (!starboard.enabled) continue;
      // Can't star messages in the starboard channel itself
      if (msg.channel.id === starboard.starboard_channel_id) continue;
      // Move reaction into DB at this point
      await this.starboardReactions.createStarboardReaction(msg.id, userId).catch();
      // If the message has already been posted to this starboard, we don't need to do anything else here
      const starboardMessages = await this.starboardMessages.getMessagesForStarboardIdAndSourceMessageId(
        starboard.starboard_channel_id,
        msg.id,
      );
      if (starboardMessages.length > 0) continue;

      const reactions = await this.starboardReactions.getAllReactionsForMessageId(msg.id);
      const reactionsCount = reactions.length;
      if (reactionsCount >= starboard.positive_required) {
        await this.saveMessageToStarboard(msg, starboard.starboard_channel_id);
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
        this.removeMessageFromStarboard(starboardMessage).catch(noop);
      }
    } else {
      messages = await this.starboardMessages.getStarboardMessagesForStarboardMessageId(msg.id);
      if (messages.length === 0) return;

      for (const starboardMessage of messages) {
        if (!starboardMessage.starboard_channel_id) continue;
        this.removeMessageFromStarboardMessages(
          starboardMessage.starboard_message_id,
          starboardMessage.starboard_channel_id,
        ).catch(noop);
      }
    }
  }

  @d.command("starboard migrate_pins", "<pinChannelId:channelId> <starboardChannelId:channelId>", {
    extra: {
      info: {
        description:
          "Migrates all of a channels pins to starboard messages, posting them in the starboard channel. The old pins are not unpinned.",
      },
    },
  })
  @d.permission("can_migrate")
  async migratePinsCmd(msg: Message, args: { pinChannelId: string; starboardChannelId }) {
    try {
      const starboards = await this.getStarboardOptsForStarboardChannel(this.bot.getChannel(args.starboardChannelId));
      if (!starboards) {
        msg.channel.createMessage(errorMessage("The specified channel doesn't have a starboard!")).catch(noop);
        return;
      }

      const channel = (await this.guild.channels.get(args.pinChannelId)) as GuildChannel & TextChannel;
      if (!channel) {
        msg.channel
          .createMessage(errorMessage("Could not find the specified channel to migrate pins from!"))
          .catch(noop);
        return;
      }

      msg.channel.createMessage(`Migrating pins from <#${channel.id}> to <#${args.starboardChannelId}>...`).catch(noop);

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

      msg.channel.createMessage(successMessage("Pins migrated!")).catch(noop);
    } catch (error) {
      this.sendErrorMessage(
        msg.channel,
        "Sorry, but something went wrong!\nSyntax: `starboard migrate_pins <sourceChannelId> <starboardChannelid>`",
      );
    }
  }
}
