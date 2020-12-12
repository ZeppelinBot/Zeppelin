import { GuildPluginData } from "knub";
import { StarboardPluginType, TStarboardOpts } from "../types";
import { Message, GuildChannel, TextChannel, Embed } from "eris";
import moment from "moment-timezone";
import { EmbedWith, EMPTY_CHAR, messageLink } from "../../../utils";
import path from "path";

export async function saveMessageToStarboard(
  pluginData: GuildPluginData<StarboardPluginType>,
  msg: Message,
  starboard: TStarboardOpts,
) {
  const channel = pluginData.guild.channels.get(starboard.channel_id);
  if (!channel) return;

  const embed: EmbedWith<"footer" | "author" | "fields" | "timestamp"> = {
    footer: {
      text: `#${(msg.channel as GuildChannel).name}`,
    },
    author: {
      name: `${msg.author.username}#${msg.author.discriminator}`,
    },
    fields: [],
    timestamp: new Date(msg.timestamp).toISOString(),
  };

  if (msg.author.avatarURL) {
    embed.author.icon_url = msg.author.avatarURL;
  }

  if (msg.content) {
    embed.description = msg.content;
  }

  // Merge media and - if copy_full_embed is enabled - fields and title from the first embed in the original message
  if (msg.embeds.length > 0) {
    if (msg.embeds[0].image) embed.image = msg.embeds[0].image;

    if (starboard.copy_full_embed) {
      if (msg.embeds[0].title) {
        const titleText = msg.embeds[0].url ? `[${msg.embeds[0].title}](${msg.embeds[0].url})` : msg.embeds[0].title;
        embed.fields.push({ name: EMPTY_CHAR, value: titleText });
      }

      if (msg.embeds[0].fields) embed.fields.push(...msg.embeds[0].fields);
    }
  }

  // If there are no embeds, add the first image attachment explicitly
  else if (msg.attachments.length) {
    for (const attachment of msg.attachments) {
      const ext = path
        .extname(attachment.filename)
        .slice(1)
        .toLowerCase();
      if (!["jpeg", "jpg", "png", "gif", "webp"].includes(ext)) continue;

      embed.image = { url: attachment.url };
      break;
    }
  }

  embed.fields.push({ name: EMPTY_CHAR, value: `[Jump to message](${messageLink(msg)})` });

  const starboardMessage = await (channel as TextChannel).createMessage({ embed });
  await pluginData.state.starboardMessages.createStarboardMessage(channel.id, msg.id, starboardMessage.id);
}
