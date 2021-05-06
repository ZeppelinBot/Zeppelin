import { GuildPluginData } from "knub";
import { UtilityPluginType } from "../types";
import { Constants, EmbedOptions } from "eris";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import { EmbedWith, formatNumber, preEmbedPadding, trimLines } from "../../../utils";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";

const TEXT_CHANNEL_ICON =
  "https://cdn.discordapp.com/attachments/740650744830623756/740656843545772062/text-channel.png";
const VOICE_CHANNEL_ICON =
  "https://cdn.discordapp.com/attachments/740650744830623756/740656845982662716/voice-channel.png";
const ANNOUNCEMENT_CHANNEL_ICON =
  "https://cdn.discordapp.com/attachments/740650744830623756/740656841687564348/announcement-channel.png";
const STAGE_CHANNEL_ICON =
  "https://cdn.discordapp.com/attachments/740650744830623756/839930647711186995/stage-channel.png";

export async function getChannelInfoEmbed(
  pluginData: GuildPluginData<UtilityPluginType>,
  channelId: string,
  requestMemberId?: string,
): Promise<EmbedOptions | null> {
  const channel = pluginData.guild.channels.get(channelId);
  if (!channel) {
    return null;
  }

  const embed: EmbedWith<"fields"> = {
    fields: [],
  };

  let icon = TEXT_CHANNEL_ICON;
  if (channel.type === Constants.ChannelTypes.GUILD_VOICE) {
    icon = VOICE_CHANNEL_ICON;
  } else if (channel.type === Constants.ChannelTypes.GUILD_NEWS) {
    icon = ANNOUNCEMENT_CHANNEL_ICON;
  } else if (channel.type === Constants.ChannelTypes.GUILD_STAGE) {
    icon = STAGE_CHANNEL_ICON;
  }

  const channelType =
    {
      [Constants.ChannelTypes.GUILD_TEXT]: "Text channel",
      [Constants.ChannelTypes.GUILD_VOICE]: "Voice channel",
      [Constants.ChannelTypes.GUILD_CATEGORY]: "Category",
      [Constants.ChannelTypes.GUILD_NEWS]: "Announcement channel",
      [Constants.ChannelTypes.GUILD_STORE]: "Store channel",
      [Constants.ChannelTypes.GUILD_STAGE]: "Stage channel",
    }[channel.type] || "Channel";

  embed.author = {
    name: `${channelType}:  ${channel.name}`,
    icon_url: icon,
  };

  let channelName = `#${channel.name}`;
  if (
    channel.type === Constants.ChannelTypes.GUILD_VOICE ||
    channel.type === Constants.ChannelTypes.GUILD_CATEGORY ||
    channel.type === Constants.ChannelTypes.GUILD_STAGE
  ) {
    channelName = channel.name;
  }

  const createdAt = moment.utc(channel.createdAt, "x");
  const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);
  const tzCreatedAt = requestMemberId
    ? await timeAndDate.inMemberTz(requestMemberId, createdAt)
    : timeAndDate.inGuildTz(createdAt);
  const prettyCreatedAt = tzCreatedAt.format(timeAndDate.getDateFormat("pretty_datetime"));
  const channelAge = humanizeDuration(Date.now() - channel.createdAt, {
    largest: 2,
    round: true,
  });

  const showMention = channel.type !== Constants.ChannelTypes.GUILD_CATEGORY;

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

  if (channel.type === Constants.ChannelTypes.GUILD_VOICE || channel.type === Constants.ChannelTypes.GUILD_STAGE) {
    const voiceMembers = Array.from(channel.voiceMembers.values());
    const muted = voiceMembers.filter(vm => vm.voiceState.mute || vm.voiceState.selfMute);
    const deafened = voiceMembers.filter(vm => vm.voiceState.deaf || vm.voiceState.selfDeaf);
    const voiceOrStage = channel.type === Constants.ChannelTypes.GUILD_VOICE ? "Voice" : "Stage";

    embed.fields.push({
      name: preEmbedPadding + `${voiceOrStage} information`,
      value: trimLines(`
        Users on ${voiceOrStage.toLowerCase()} channel: **${formatNumber(voiceMembers.length)}**
        Muted: **${formatNumber(muted.length)}**
        Deafened: **${formatNumber(deafened.length)}**
      `),
    });
  }

  if (channel.type === Constants.ChannelTypes.GUILD_CATEGORY) {
    const textChannels = pluginData.guild.channels.filter(
      ch => ch.parentID === channel.id && ch.type !== Constants.ChannelTypes.GUILD_VOICE,
    );
    const voiceChannels = pluginData.guild.channels.filter(
      ch =>
        ch.parentID === channel.id &&
        (ch.type === Constants.ChannelTypes.GUILD_VOICE || ch.type === Constants.ChannelTypes.GUILD_STAGE),
    );

    embed.fields.push({
      name: preEmbedPadding + "Category information",
      value: trimLines(`
        Text channels: **${textChannels.length}**
        Voice channels: **${voiceChannels.length}**
      `),
    });
  }

  return embed;
}
