import { ChannelType, MessageEmbedOptions, Snowflake, StageChannel, ThreadChannel, VoiceChannel } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
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
      [ChannelType.GuildVoice]: VOICE_CHANNEL_ICON,
      [ChannelType.GuildAnnouncement]: ANNOUNCEMENT_CHANNEL_ICON,
      [ChannelType.GuildStageVoice]: STAGE_CHANNEL_ICON,
      [ChannelType.PublicThread]: PUBLIC_THREAD_ICON,
      [ChannelType.PrivateThread]: PRIVATE_THREAD_UCON,
    }[channel.type] || TEXT_CHANNEL_ICON;

  const channelType =
    {
      [ChannelType.GuildText]: "Text channel",
      [ChannelType.GuildVoice]: "Voice channel",
      [ChannelType.GuildCategory]: "Category channel",
      [ChannelType.GuildAnnouncement]: "Announcement channel",
      [ChannelType.GuildStageVoice]: "Stage channel",
      [ChannelType.PublicThread]: "Public Thread channel",
      [ChannelType.PrivateThread]: "Private Thread channel",
      [ChannelType.AnnouncementThread]: "News Thread channel",
      [ChannelType.GuildDirectory]: "Hub channel",
      [ChannelType.GuildForum]: "Forum channel",
    }[channel.type] || "Channel";

  embed.author = {
    name: `${channelType}:  ${channel.name}`,
    icon_url: icon,
  };

  let channelName = `#${channel.name}`;
  if (
    channel.type === ChannelType.GuildVoice ||
    channel.type === ChannelType.GuildCategory ||
    channel.type === ChannelType.GuildStageVoice ||
    channel.type === ChannelType.GuildDirectory
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

  const showMention = channel.type !== ChannelType.GuildCategory;

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

  if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
    const voiceMembers = Array.from((channel as VoiceChannel | StageChannel).members.values());
    const muted = voiceMembers.filter((vm) => vm.voice.mute || vm.voice.selfMute);
    const deafened = voiceMembers.filter((vm) => vm.voice.deaf || vm.voice.selfDeaf);
    const voiceOrStage = channel.type === ChannelType.GuildVoice ? "Voice" : "Stage";

    embed.fields.push({
      name: preEmbedPadding + `${voiceOrStage} information`,
      value: trimLines(`
        Users on ${voiceOrStage.toLowerCase()} channel: **${formatNumber(voiceMembers.length)}**
        Muted: **${formatNumber(muted.length)}**
        Deafened: **${formatNumber(deafened.length)}**
      `),
    });
  }

  if (channel.type === ChannelType.GuildCategory) {
    const textChannels = pluginData.guild.channels.cache.filter(
      (ch) => ch.parentId === channel.id && ch.type !== ChannelType.GuildVoice,
    );
    const voiceChannels = pluginData.guild.channels.cache.filter(
      (ch) =>
        ch.parentId === channel.id && (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice),
    );

    embed.fields.push({
      name: preEmbedPadding + "Category information",
      value: trimLines(`
        Text channels: **${textChannels.size}**
        Voice channels: **${voiceChannels.size}**
      `),
    });
  }

  if (channel.type === ChannelType.PrivateThread || channel.type === ChannelType.PublicThread) {
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
