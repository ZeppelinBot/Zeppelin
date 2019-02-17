import { decorators as d, waitForReply, utils as knubUtils } from "knub";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { GuildStarboards } from "../data/GuildStarboards";
import { GuildChannel, Message, TextChannel } from "eris";
import {
  customEmojiRegex,
  errorMessage,
  getEmojiInString,
  getUrlsInString,
  noop,
  snowflakeRegex,
  successMessage,
} from "../utils";
import { Starboard } from "../data/entities/Starboard";
import path from "path";
import moment from "moment-timezone";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { SavedMessage } from "../data/entities/SavedMessage";

export class StarboardPlugin extends ZeppelinPlugin {
  public static pluginName = "starboard";

  protected starboards: GuildStarboards;
  protected savedMessages: GuildSavedMessages;

  private onMessageDeleteFn;

  getDefaultOptions() {
    return {
      permissions: {
        manage: false,
      },

      overrides: [
        {
          level: ">=100",
          permissions: {
            manage: true,
          },
        },
      ],
    };
  }

  onLoad() {
    this.starboards = GuildStarboards.getInstance(this.guildId);
    this.savedMessages = GuildSavedMessages.getInstance(this.guildId);

    this.onMessageDeleteFn = this.onMessageDelete.bind(this);
    this.savedMessages.events.on("delete", this.onMessageDeleteFn);
  }

  onUnload() {
    this.savedMessages.events.off("delete", this.onMessageDeleteFn);
  }

  /**
   * An interactive setup for creating a starboard
   */
  @d.command("starboard create")
  @d.permission("manage")
  async setupCmd(msg: Message) {
    const cancelMsg = () => msg.channel.createMessage("Cancelled");

    msg.channel.createMessage(
      `⭐ Let's make a starboard! What channel should we use as the board? ("cancel" to cancel)`,
    );

    let starboardChannel;
    do {
      const reply = await waitForReply(this.bot, msg.channel as TextChannel, msg.author.id, 60000);
      if (reply.content == null || reply.content === "cancel") return cancelMsg();

      starboardChannel = knubUtils.resolveChannel(this.guild, reply.content || "");
      if (!starboardChannel) {
        msg.channel.createMessage("Invalid channel. Try again?");
        continue;
      }

      const existingStarboard = await this.starboards.getStarboardByChannelId(starboardChannel.id);
      if (existingStarboard) {
        msg.channel.createMessage("That channel already has a starboard. Try again?");
        starboardChannel = null;
        continue;
      }
    } while (starboardChannel == null);

    msg.channel.createMessage(`Ok. Which emoji should we use as the trigger? ("cancel" to cancel)`);

    let emoji;
    do {
      const reply = await waitForReply(this.bot, msg.channel as TextChannel, msg.author.id);
      if (reply.content == null || reply.content === "cancel") return cancelMsg();

      const allEmojis = getEmojiInString(reply.content || "");
      if (!allEmojis.length) {
        msg.channel.createMessage("Invalid emoji. Try again?");
        continue;
      }

      emoji = allEmojis[0];

      const customEmojiMatch = emoji.match(customEmojiRegex);
      if (customEmojiMatch) {
        // <:name:id> to name:id, as Eris puts them in the message reactions object
        emoji = `${customEmojiMatch[1]}:${customEmojiMatch[2]}`;
      }
    } while (emoji == null);

    msg.channel.createMessage(
      `And how many reactions are required to immortalize a message in the starboard? ("cancel" to cancel)`,
    );

    let requiredReactions;
    do {
      const reply = await waitForReply(this.bot, msg.channel as TextChannel, msg.author.id);
      if (reply.content == null || reply.content === "cancel") return cancelMsg();

      requiredReactions = parseInt(reply.content || "", 10);

      if (Number.isNaN(requiredReactions)) {
        msg.channel.createMessage("Invalid number. Try again?");
        continue;
      }

      if (typeof requiredReactions === "number") {
        if (requiredReactions <= 0) {
          msg.channel.createMessage("The number must be higher than 0. Try again?");
          continue;
        } else if (requiredReactions > 65536) {
          msg.channel.createMessage("The number must be smaller than 65536. Try again?");
          continue;
        }
      }
    } while (requiredReactions == null);

    msg.channel.createMessage(
      `And finally, which channels can messages be starred in? "All" for any channel. ("cancel" to cancel)`,
    );

    let channelWhitelist;
    do {
      const reply = await waitForReply(this.bot, msg.channel as TextChannel, msg.author.id);
      if (reply.content == null || reply.content === "cancel") return cancelMsg();

      if (reply.content.toLowerCase() === "all") {
        channelWhitelist = null;
        break;
      }

      channelWhitelist = reply.content.match(new RegExp(snowflakeRegex, "g"));

      let hasInvalidChannels = false;
      for (const id of channelWhitelist) {
        const channel = this.guild.channels.get(id);
        if (!channel || !(channel instanceof TextChannel)) {
          msg.channel.createMessage(`Couldn't recognize channel <#${id}> (\`${id}\`). Try again?`);
          hasInvalidChannels = true;
          break;
        }
      }
      if (hasInvalidChannels) continue;
    } while (channelWhitelist == null);

    await this.starboards.create(starboardChannel.id, channelWhitelist, emoji, requiredReactions);

    msg.channel.createMessage(successMessage("Starboard created!"));
  }

  /**
   * Deletes the starboard from the specified channel. The already-posted starboard messages are retained.
   */
  @d.command("starboard delete", "<channelId:channelId>")
  @d.permission("manage")
  async deleteCmd(msg: Message, args: { channelId: string }) {
    const starboard = await this.starboards.getStarboardByChannelId(args.channelId);
    if (!starboard) {
      msg.channel.createMessage(errorMessage(`Channel <#${args.channelId}> doesn't have a starboard!`));
      return;
    }

    await this.starboards.delete(starboard.channel_id);

    msg.channel.createMessage(successMessage(`Starboard deleted from <#${args.channelId}>!`));
  }

  /**
   * When a reaction is added to a message, check if there are any applicable starboards and if the reactions reach
   * the required threshold. If they do, post the message in the starboard channel.
   */
  @d.event("messageReactionAdd")
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

    const emojiStr = emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name;
    const applicableStarboards = await this.starboards.getStarboardsByEmoji(emojiStr);

    for (const starboard of applicableStarboards) {
      // Can't star messages in the starboard channel itself
      if (msg.channel.id === starboard.channel_id) continue;

      if (starboard.channel_whitelist) {
        const allowedChannelIds = starboard.channel_whitelist.split(",");
        if (!allowedChannelIds.includes(msg.channel.id)) continue;
      }

      // If the message has already been posted to this starboard, we don't need to do anything else here
      const existingSavedMessage = await this.starboards.getStarboardMessageByStarboardIdAndMessageId(
        starboard.id,
        msg.id,
      );
      if (existingSavedMessage) return;

      const reactionsCount = await this.countReactions(msg, emojiStr);

      if (reactionsCount >= starboard.reactions_required) {
        await this.saveMessageToStarboard(msg, starboard);
      }
    }
  }

  /**
   * Counts the specific reactions in the message, ignoring the message author
   */
  async countReactions(msg: Message, reaction) {
    let reactionsCount = (msg.reactions[reaction] && msg.reactions[reaction].count) || 0;

    // Ignore self-stars
    const reactors = await msg.getReaction(reaction);
    if (reactors.some(u => u.id === msg.author.id)) reactionsCount--;

    return reactionsCount;
  }

  /**
   * Saves/posts a message to the specified starboard. The message is posted as an embed and image attachments are
   * included as the embed image.
   */
  async saveMessageToStarboard(msg: Message, starboard: Starboard) {
    const channel = this.guild.channels.get(starboard.channel_id);
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
    await this.starboards.createStarboardMessage(starboard.id, msg.id, starboardMessage.id);
  }

  /**
   * Remove a message from the specified starboard
   */
  async removeMessageFromStarboard(msgId: string, starboard: Starboard) {
    const starboardMessage = await this.starboards.getStarboardMessageByStarboardIdAndMessageId(starboard.id, msgId);
    if (!starboardMessage) return;

    await this.bot.deleteMessage(starboard.channel_id, starboardMessage.starboard_message_id).catch(noop);
    await this.starboards.deleteStarboardMessage(starboard.id, msgId);
  }

  /**
   * When a message is deleted, also delete it from any starboards it's been posted in.
   * This function is called in response to GuildSavedMessages events.
   * TODO: When a message is removed from the starboard itself, i.e. the bot's embed is removed, also remove that message from the starboard_messages database table
   */
  async onMessageDelete(msg: SavedMessage) {
    const starboardMessages = await this.starboards.with("starboard").getStarboardMessagesByMessageId(msg.id);
    if (!starboardMessages.length) return;

    for (const starboardMessage of starboardMessages) {
      if (!starboardMessage.starboard) continue;
      this.removeMessageFromStarboard(starboardMessage.message_id, starboardMessage.starboard);
    }
  }

  @d.command("starboard migrate_pins", "<pinChannelId:channelId> <starboardChannelId:channelId>")
  async migratePinsCmd(msg: Message, args: { pinChannelId: string; starboardChannelId }) {
    const starboard = await this.starboards.getStarboardByChannelId(args.starboardChannelId);
    if (!starboard) {
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
      const existingStarboardMessage = await this.starboards.getStarboardMessageByStarboardIdAndMessageId(
        starboard.id,
        pin.id,
      );
      if (existingStarboardMessage) continue;

      await this.saveMessageToStarboard(pin, starboard);
    }

    msg.channel.createMessage(successMessage("Pins migrated!"));
  }
}
