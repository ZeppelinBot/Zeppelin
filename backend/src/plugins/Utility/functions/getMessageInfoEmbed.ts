import { APIEmbed, MessageType, Snowflake, TextChannel } from "discord.js";
import { GuildPluginData, getDefaultMessageCommandPrefix } from "vety";
import {
  EmbedWith,
  chunkMessageLines,
  messageLink,
  preEmbedPadding,
  renderUsername,
  trimEmptyLines,
  trimLines,
} from "../../../utils.js";
import { UtilityPluginType } from "../types.js";

const MESSAGE_ICON = "https://cdn.discordapp.com/attachments/740650744830623756/740685652152025088/message.png";

export async function getMessageInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  channelId: string,
  messageId: string,
): Promise<APIEmbed | null> {
  const message = await (pluginData.guild.channels.resolve(channelId as Snowflake) as TextChannel).messages
    .fetch(messageId as Snowflake)
    .catch(() => null);
  if (!message) {
    return null;
  }

  const embed: EmbedWith<"fields" | "author"> = {
    fields: [],
    author: {
      name: `Message:  ${message.id}`,
      icon_url: MESSAGE_ICON,
    },
  };

  const type =
    {
      [MessageType.Default]: "Regular message",
      [MessageType.ChannelPinnedMessage]: "System message",
      [MessageType.UserJoin]: "System message",
      [MessageType.GuildBoost]: "System message",
      [MessageType.GuildBoostTier1]: "System message",
      [MessageType.GuildBoostTier2]: "System message",
      [MessageType.GuildBoostTier3]: "System message",
      [MessageType.ChannelFollowAdd]: "System message",
      [MessageType.GuildDiscoveryDisqualified]: "System message",
      [MessageType.GuildDiscoveryRequalified]: "System message",
    }[message.type] ?? "Unknown";

  embed.fields.push({
    name: preEmbedPadding + "Message information",
    value: trimEmptyLines(
      trimLines(`
      ID: \`${message.id}\`
      Channel: <#${message.channel.id}>
      Channel ID: \`${message.channel.id}\`
      Created: **<t:${Math.round(message.createdTimestamp / 1000)}:R>**
      ${message.editedTimestamp ? `Edited at: **<t:${Math.round(message.editedTimestamp / 1000)}:R>**` : ""}
      Type: **${type}**
      Link: [**Go to message ➔**](${messageLink(pluginData.guild.id, message.channel.id, message.id)})
    `),
    ),
  });

  const authorJoinedAtTS = message.member?.joinedTimestamp;

  embed.fields.push({
    name: preEmbedPadding + "Author information",
    value: trimLines(`
      Name: **${renderUsername(message.author)}**
      ID: \`${message.author.id}\`
      Created: **<t:${Math.round(message.author.createdTimestamp / 1000)}:R>**
      ${authorJoinedAtTS ? `Joined: **<t:${Math.round(authorJoinedAtTS / 1000)}:R>**` : ""}
      Mention: <@!${message.author.id}>
    `),
  });

  const textContent = message.content || "<no text content>";
  const chunked = chunkMessageLines(textContent, 1014);
  for (const [i, chunk] of chunked.entries()) {
    embed.fields.push({
      name: i === 0 ? preEmbedPadding + "Text content" : "[...]",
      value: chunk,
    });
  }

  if (message.attachments.size) {
    const attachmentUrls = message.attachments.map((att) => att.url);
    embed.fields.push({
      name: preEmbedPadding + "Attachments",
      value: attachmentUrls.join("\n"),
    });
  }

  if (message.embeds.length) {
    const prefix = pluginData.fullConfig.prefix || getDefaultMessageCommandPrefix(pluginData.client);
    embed.fields.push({
      name: preEmbedPadding + "Embeds",
      value: `Message contains an embed, use \`${prefix}source\` to see the embed source`,
    });
  }

  return embed;
}
