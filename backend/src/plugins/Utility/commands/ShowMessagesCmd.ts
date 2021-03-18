import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import {
  chunkMessageLines,
  convertMSToDelayString,
  disableCodeBlocks,
  disableInlineCode,
  EmbedWith,
} from "../../../utils";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import moment from "moment";
import { canReadChannel } from "../../../utils/canReadChannel";
import { GuildChannel } from "eris";

export const ShowMessagesCmd = utilityCmd({
  trigger: ["show_messages", "messages", "recent_messages", "showmessages"],
  description: "Shows recent messages of a user",
  usage: "!show_messages 108552944961454080",
  permission: "can_showmessage",
  source: "guild",

  signature: {
    user: ct.resolvedUser(),
    amount: ct.number({ required: false }),
    fullMessage: ct.switchOption({ shortcut: "f" }),
  },

  async run({ message, args, pluginData }) {
    const latestMessages = (await pluginData.state.savedMessages.getLatestByUser(args.user.id, args.amount)).reverse();
    if (latestMessages.length === 0) {
      message.channel.createMessage(`No recent messages by user!`);
      return;
    }
    const messagesToChannelMap: Map<string, SavedMessage[]> = new Map();
    for (const msg of latestMessages) {
      if (messagesToChannelMap[msg.channel_id] == null) messagesToChannelMap[msg.channel_id] = [];
      messagesToChannelMap[msg.channel_id].push(msg);
    }

    const embed: EmbedWith<"fields"> = {
      fields: [],
    };

    let description = "";
    for (const channel in messagesToChannelMap) {
      const messages: SavedMessage[] = messagesToChannelMap[channel];
      if (!canReadChannel(pluginData.guild.channels.get(channel) as GuildChannel, message.member)) continue;
      description += `**Messages in <#${channel}>:**`;

      for (const msg of messages) {
        // Trim preview down to 50 (47 with ...) characters as to not overflow chat (unless -f switch is set)
        const formattedContent =
          msg.data.content.length > 50 && !args.fullMessage
            ? msg.data.content.substring(0, 47) + "..."
            : msg.data.content;
        // We remove milliseconds here as to not show 3 decimal points (which appears on both convertMSToDelayString and humanizeDurationShort)
        const timeAgo = convertMSToDelayString(
          moment()
            .milliseconds(0)
            .valueOf() -
            moment(msg.posted_at)
              .milliseconds(0)
              .valueOf(),
        );

        description += `\n\`${disableCodeBlocks(
          disableInlineCode(formattedContent),
        )}\`, ${timeAgo} ago \[[Link](https://discord.com/channels/${msg.guild_id}/${msg.channel_id}/${msg.id})\]`;
      }
      description += `\n\n`;
    }

    embed.author = {
      name: args.user.username + "#" + args.user.discriminator,
      icon_url: args.user.avatarURL,
    };

    // Chunking to 1950 max length to accomodate footer and/or header
    const chunkedDescription = chunkMessageLines(description.trim(), 1950);
    for (let i = 0; i < chunkedDescription.length; i++) {
      embed.description = chunkedDescription[i];

      // Only show author on top-most embed and footer on bottom-most embed to keep visual throughline
      if (i > 0) {
        embed.author = undefined;
      }
      if (i === chunkedDescription.length - 1) {
        embed.footer = { text: `Showing ${latestMessages.length} recent messages` };
      }

      await message.channel.createMessage({ embed });
    }
  },
});
