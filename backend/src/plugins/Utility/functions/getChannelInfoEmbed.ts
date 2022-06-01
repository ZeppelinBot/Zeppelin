import { MessageEmbedOptions, Snowflake, StageChannel, ThreadChannel, VoiceChannel } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { ChannelTypeStrings } from "src/types";
import { EmbedWith, formatNumber, MINUTES, preEmbedPadding, trimLines, verboseUserMention } from "../../../utils";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { UtilityPluginType } from "../types";

const TEXT_CHANNEL_ICON =
  "https://cdn.discordapp.com/attachments/740650744830623756/740656843545772062/text-channel.png";
const VOICE_CHANNEL_ICON =
  "https://cdn.discordapp.com/attachments/740650744830623756/740656845982662716/voice-channel.png";
const ANNOUNCEMENT_CHANNEL_ICON =
  "https://cdn.discordapp.com/attachments/740650744830623756/740656841687564348/announcement-channel.png";
const STAGE_CHANNEL_ICON =
  "https://cdn.discordapp.com/attachments/740650744830623756/839930647711186995/stage-channel.png";
const PUBLIC_THREAD_ICON =
  "https://cdn.discordapp.com/attachments/740650744830623756/870343055855738921/public-thread.png";
const PRIVATE_THREAD_UCON =
  "https://cdn.discordapp.com/attachments/740650744830623756/870343402447839242/private-thread.png";

export async function getChannelInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  channelId: string,
  requestMemberId?: string,
): Promise<MessageEmbedOptions | null> {
  const channel = pluginData.guild.channels.cache.get(channelId as Snowflake);
  if (!channel) {
    return null;
  }

  const embed: EmbedWith<"fields"> = {
    fields: [],
  };

  const icon =
    {
      [ChannelTypeStrings.VOICE]: VOICE_CHANNEL_ICON,
      [ChannelTypeStrings.NEWS]: ANNOUNCEMENT_CHANNEL_ICON,
      [ChannelTypeStrings.STAGE]: STAGE_CHANNEL_ICON,
      [ChannelTypeStrings.PUBLIC_THREAD]: PUBLIC_THREAD_ICON,
      [ChannelTypeStrings.PRIVATE_THREAD]: PRIVATE_THREAD_UCON,
    }[channel.type] || TEXT_CHANNEL_ICON;

  const channelType =
    {
      [ChannelTypeStrings.TEXT]: "Text channel",
      [ChannelTypeStrings.VOICE]: "Voice channel",
      [ChannelTypeStrings.CATEGORY]: "Category",
      [ChannelTypeStrings.NEWS]: "Announcement channel",
      [ChannelTypeStrings.STORE]: "Store channel",
      [ChannelTypeStrings.STAGE]: "Stage channel",
      [ChannelTypeStrings.PUBLIC_THREAD]: "Public Thread channel",
      [ChannelTypeStrings.PRIVATE_THREAD]: "Private Thread channel",
      [ChannelTypeStrings.NEWS_THREAD]: "News Thread channel",
    }[channel.type] || "Channel";

  embed.author = {
    name: `${channelType}:  ${channel.name}`,
    icon_url: icon,
  };

  let channelName = `#${channel.name}`;
  if (
    channel.type === ChannelTypeStrings.VOICE ||
    channel.type === ChannelTypeStrings.CATEGORY ||
    channel.type === ChannelTypeStrings.STAGE
  ) {
    channelName = channel.name;
  }

  const createdAt = moment.utc(channel.createdAt!, "x");
  const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);
  const tzCreatedAt = requestMemberId
    ? await timeAndDate.inMemberTz(requestMemberId, createdAt)
    : timeAndDate.inGuildTz(createdAt);
  const prettyCreatedAt = tzCreatedAt.format(timeAndDate.getDateFormat("pretty_datetime"));
  const channelAge = humanizeDuration(Date.now() - channel.createdTimestamp!, {
    largest: 2,
    round: true,
  });

  const showMention = channel.type !== ChannelTypeStrings.CATEGORY;

  embed.fields.push({
    name: preEmbedPadding + "Channel information",
    value: trimLines(`
      Name: **${channelName}**
      ID: \`${channel.id}\`
      Created: **${channelAge} ago** (\`${prettyCreatedAt}\`)
      Type: **${channelType}**
      ${showMention ? `Mention: <#${channel.id}>` : ""}
    `),
  });

  if (channel.type === ChannelTypeStrings.VOICE || channel.type === ChannelTypeStrings.STAGE) {
    const voiceMembers = Array.from((channel as VoiceChannel | StageChannel).members.values());
    const muted = voiceMembers.filter((vm) => vm.voice.mute || vm.voice.selfMute);
    const deafened = voiceMembers.filter((vm) => vm.voice.deaf || vm.voice.selfDeaf);
    const voiceOrStage = channel.type === ChannelTypeStrings.VOICE ? "Voice" : "Stage";

    embed.fields.push({
      name: preEmbedPadding + `${voiceOrStage} information`,
      value: trimLines(`
        Users on ${voiceOrStage.toLowerCase()} channel: **${formatNumber(voiceMembers.length)}**
        Muted: **${formatNumber(muted.length)}**
        Deafened: **${formatNumber(deafened.length)}**
      `),
    });
  }

  if (channel.type === ChannelTypeStrings.CATEGORY) {
    const textChannels = pluginData.guild.channels.cache.filter(
      (ch) => ch.parentId === channel.id && ch.type !== ChannelTypeStrings.VOICE,
    );
    const voiceChannels = pluginData.guild.channels.cache.filter(
      (ch) =>
        ch.parentId === channel.id && (ch.type === ChannelTypeStrings.VOICE || ch.type === ChannelTypeStrings.STAGE),
    );

    embed.fields.push({
      name: preEmbedPadding + "Category information",
      value: trimLines(`
        Text channels: **${textChannels.size}**
        Voice channels: **${voiceChannels.size}**
      `),
    });
  }

  if (channel.type === ChannelTypeStrings.PRIVATE_THREAD || channel.type === ChannelTypeStrings.PUBLIC_THREAD) {
    const thread = channel as ThreadChannel;
    const parentChannelName = thread.parent?.name ?? `<#${thread.parentId}>`;
    const memberCount = thread.memberCount ?? thread.members.cache.size;
    const owner = await thread.fetchOwner().catch(() => null);
    const ownerMention = owner?.user ? verboseUserMention(owner.user) : "Unknown#0000";
    const humanizedArchiveTime = `Archive duration: **${humanizeDuration(
      (thread.autoArchiveDuration ?? 0) * MINUTES,
    )}**`;

    embed.fields.push({
      name: preEmbedPadding + "Thread information",
      value: trimLines(`
      Parent channel: **#${parentChannelName}**
      Member count: **${memberCount}**
      Thread creator: ${ownerMention}
      ${thread.archived ? "Archived: **True**" : humanizedArchiveTime}`),
    });
  }

  return embed;
}
