import { PluginData } from "knub";
import { UtilityPluginType } from "../types";
import { Constants, EmbedOptions } from "eris";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import { formatNumber, preEmbedPadding, trimLines } from "../../../utils";

const TEXT_CHANNEL_ICON =
  "https://cdn.discordapp.com/attachments/740650744830623756/740656843545772062/text-channel.png";
const VOICE_CHANNEL_ICON =
  "https://cdn.discordapp.com/attachments/740650744830623756/740656845982662716/voice-channel.png";
const ANNOUNCEMENT_CHANNEL_ICON =
  "https://cdn.discordapp.com/attachments/740650744830623756/740656841687564348/announcement-channel.png";

export async function getChannelInfoEmbed(
  pluginData: PluginData<UtilityPluginType>,
  channelId: string,
): Promise<EmbedOptions | null> {
  const channel = pluginData.guild.channels.get(channelId);
  if (!channel) {
    return null;
  }

  const embed: EmbedOptions = {
    fields: [],
  };

  let icon;
  if (channel.type === Constants.ChannelTypes.GUILD_VOICE) {
    icon = VOICE_CHANNEL_ICON;
  } else if (channel.type === Constants.ChannelTypes.GUILD_NEWS) {
    icon = ANNOUNCEMENT_CHANNEL_ICON;
  } else {
    icon = TEXT_CHANNEL_ICON;
  }

  const channelType =
    {
      [Constants.ChannelTypes.GUILD_TEXT]: "Text channel",
      [Constants.ChannelTypes.GUILD_VOICE]: "Voice channel",
      [Constants.ChannelTypes.GUILD_CATEGORY]: "Category",
      [Constants.ChannelTypes.GUILD_NEWS]: "Announcement channel",
      [Constants.ChannelTypes.GUILD_STORE]: "Store channel",
    }[channel.type] || "Channel";

  embed.author = {
    name: `${channelType}:  ${channel.name}`,
    icon_url: icon,
  };

  let channelName;
  if (channel.type === Constants.ChannelTypes.GUILD_VOICE || channel.type === Constants.ChannelTypes.GUILD_CATEGORY) {
    channelName = channel.name;
  } else {
    channelName = `#${channel.name}`;
  }

  const createdAt = moment(channel.createdAt, "x");
  const channelAge = humanizeDuration(Date.now() - channel.createdAt, {
    largest: 2,
    round: true,
  });

  const showMention =
    channel.type !== Constants.ChannelTypes.GUILD_VOICE && channel.type !== Constants.ChannelTypes.GUILD_CATEGORY;

  embed.fields.push({
    name: preEmbedPadding + "Channel information",
    value: trimLines(`
      Name: **${channelName}**
      ID: \`${channel.id}\`
      Created: **${channelAge} ago** (\`${createdAt.format("MMM D, YYYY [at] H:mm [UTC]")}\`)
      Type: **${channelType}**
      ${showMention ? `Mention: <#${channel.id}>` : ""}
    `),
  });

  if (channel.type === Constants.ChannelTypes.GUILD_VOICE) {
    const voiceMembers = Array.from(channel.voiceMembers.values());
    const muted = voiceMembers.filter(vm => vm.voiceState.mute || vm.voiceState.selfMute);
    const deafened = voiceMembers.filter(vm => vm.voiceState.deaf || vm.voiceState.selfDeaf);

    embed.fields.push({
      name: preEmbedPadding + "Voice information",
      value: trimLines(`
        Users on voice channel: **${formatNumber(voiceMembers.length)}**
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
      ch => ch.parentID === channel.id && ch.type === Constants.ChannelTypes.GUILD_VOICE,
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
