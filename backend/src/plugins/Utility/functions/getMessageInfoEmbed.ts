import { APIEmbed, MessageType, Snowflake, TextChannel } from "discord.js";
import humanizeDuration from "humanize-duration";
import { getDefaultMessageCommandPrefix, GuildPluginData } from "knub";
import moment from "moment-timezone";
import { chunkMessageLines, EmbedWith, messageLink, preEmbedPadding, trimEmptyLines, trimLines } from "../../../utils";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { UtilityPluginType } from "../types";

const MESSAGE_ICON = "https://cdn.discordapp.com/attachments/740650744830623756/740685652152025088/message.png";

export async function getMessageInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  channelId: string,
  messageId: string,
  requestMemberId?: string,
): Promise<APIEmbed | null> {
  const message = await (pluginData.guild.channels.resolve(channelId as Snowflake) as TextChannel).messages
    .fetch(messageId as Snowflake)
    .catch(() => null);
  if (!message) {
    return null;
  }

  const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);

  const embed: EmbedWith<"fields" | "author"> = {
    fields: [],
    author: {
      name: `Message:  ${message.id}`,
      icon_url: MESSAGE_ICON,
    },
  };

  const createdAt = moment.utc(message.createdAt, "x");
  const tzCreatedAt = requestMemberId
    ? await timeAndDate.inMemberTz(requestMemberId, createdAt)
    : timeAndDate.inGuildTz(createdAt);
  const prettyCreatedAt = tzCreatedAt.format(timeAndDate.getDateFormat("pretty_datetime"));
  const messageAge = humanizeDuration(Date.now() - message.createdTimestamp, {
    largest: 2,
    round: true,
  });

  const editedAt = message.editedTimestamp ? moment.utc(message.editedTimestamp!, "x") : undefined;
  const tzEditedAt = requestMemberId
    ? await timeAndDate.inMemberTz(requestMemberId, editedAt)
    : timeAndDate.inGuildTz(editedAt);
  const prettyEditedAt = tzEditedAt.format(timeAndDate.getDateFormat("pretty_datetime"));
  const editAge =
    message.editedTimestamp &&
    humanizeDuration(Date.now() - message.editedTimestamp, {
      largest: 2,
      round: true,
    });

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
      Created: **${messageAge} ago** (\`${prettyCreatedAt}\`)
      ${editedAt ? `Edited at: **${editAge} ago** (\`${prettyEditedAt}\`)` : ""}
      Type: **${type}**
      Link: [**Go to message ➔**](${messageLink(pluginData.guild.id, message.channel.id, message.id)})
    `),
    ),
  });

  const authorCreatedAt = moment.utc(message.author.createdAt, "x");
  const tzAuthorCreatedAt = requestMemberId
    ? await timeAndDate.inMemberTz(requestMemberId, authorCreatedAt)
    : timeAndDate.inGuildTz(authorCreatedAt);
  const prettyAuthorCreatedAt = tzAuthorCreatedAt.format(timeAndDate.getDateFormat("pretty_datetime"));
  const authorAccountAge = humanizeDuration(Date.now() - message.author.createdTimestamp, {
    largest: 2,
    round: true,
  });

  const authorJoinedAt = message.member && moment.utc(message.member.joinedTimestamp!, "x");
  const tzAuthorJoinedAt = authorJoinedAt
    ? requestMemberId
      ? await timeAndDate.inMemberTz(requestMemberId, authorJoinedAt)
      : timeAndDate.inGuildTz(authorJoinedAt)
    : null;
  const prettyAuthorJoinedAt = tzAuthorJoinedAt?.format(timeAndDate.getDateFormat("pretty_datetime"));
  const authorServerAge =
    message.member &&
    humanizeDuration(Date.now() - message.member.joinedTimestamp!, {
      largest: 2,
      round: true,
    });

  embed.fields.push({
    name: preEmbedPadding + "Author information",
    value: trimLines(`
      Name: **${message.author.tag}**
      ID: \`${message.author.id}\`
      Created: **${authorAccountAge} ago** (\`${prettyAuthorCreatedAt}\`)
      ${authorJoinedAt ? `Joined: **${authorServerAge} ago** (\`${prettyAuthorJoinedAt}\`)` : ""}
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
