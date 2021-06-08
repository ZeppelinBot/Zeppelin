import { GuildChannel, Message } from "discord.js";
import path from "path";
import { EmbedWith, EMPTY_CHAR } from "../../../utils";

const imageAttachmentExtensions = ["jpeg", "jpg", "png", "gif", "webp"];
const audioAttachmentExtensions = ["wav", "mp3", "m4a"];
const videoAttachmentExtensions = ["mp4", "mkv", "mov"];

type StarboardEmbed = EmbedWith<"footer" | "author" | "fields" | "timestamp">;

export function createStarboardEmbedFromMessage(
  msg: Message,
  copyFullEmbed: boolean,
  color?: number | null,
): StarboardEmbed {
  const embed: StarboardEmbed = {
    footer: {
      text: `#${(msg.channel as GuildChannel).name}`,
    },
    author: {
      name: `${msg.author.username}#${msg.author.discriminator}`,
    },
    fields: [],
    timestamp: msg.createdAt,
  };

  if (color != null) {
    embed.color = color;
  }

  if (msg.author.avatarURL()) {
    embed.author.icon_url = msg.author.avatarURL()!;
  }

  // The second condition here checks for messages with only an image link that is then embedded.
  // The message content in that case is hidden by the Discord client, so we hide it here too.
  if (msg.content && msg.embeds[0]?.thumbnail?.url !== msg.content) {
    embed.description = msg.content;
  }

  // Merge media and - if copy_full_embed is enabled - fields and title from the first embed in the original message
  if (msg.embeds.length > 0) {
    if (msg.embeds[0].image) {
      embed.image = msg.embeds[0].image;
    } else if (msg.embeds[0].thumbnail) {
      embed.image = { url: msg.embeds[0].thumbnail.url };
    }

    if (copyFullEmbed) {
      if (msg.embeds[0].title) {
        const titleText = msg.embeds[0].url ? `[${msg.embeds[0].title}](${msg.embeds[0].url})` : msg.embeds[0].title;
        embed.fields.push({ name: EMPTY_CHAR, value: titleText });
      }

      if (msg.embeds[0].fields) {
        embed.fields.push(...msg.embeds[0].fields);
      }
    }
  }

  // If there are no embeds, add the first image attachment explicitly
  else if (msg.attachments.size) {
    for (const attachment of msg.attachments) {
      const ext = path
        .extname(attachment[1].name!)
        .slice(1)
        .toLowerCase();

      if (imageAttachmentExtensions.includes(ext)) {
        embed.image = { url: attachment[1].url };
        break;
      }

      if (audioAttachmentExtensions.includes(ext)) {
        embed.fields.push({ name: EMPTY_CHAR, value: `*Message contains an audio clip*` });
        break;
      }

      if (videoAttachmentExtensions.includes(ext)) {
        embed.fields.push({ name: EMPTY_CHAR, value: `*Message contains a video*` });
        break;
      }
    }
  }

  return embed;
}
