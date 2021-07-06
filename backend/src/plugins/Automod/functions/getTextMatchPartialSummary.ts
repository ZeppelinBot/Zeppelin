import { Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { messageSummary, verboseChannelMention } from "../../../utils";
import { AutomodContext, AutomodPluginType } from "../types";
import { MatchableTextType } from "./matchMultipleTextTypesOnMessage";

export function getTextMatchPartialSummary(
  pluginData: GuildPluginData<AutomodPluginType>,
  type: MatchableTextType,
  context: AutomodContext,
) {
  if (type === "message") {
    const message = context.message!;
    const channel = pluginData.guild.channels.cache.get(message.channel_id as Snowflake) as TextChannel;
    const channelMention = channel ? verboseChannelMention(channel) : `\`#${message.channel_id}\``;

    return `message in ${channelMention}:\n${messageSummary(message)}`;
  } else if (type === "embed") {
    const message = context.message!;
    const channel = pluginData.guild.channels.cache.get(message.channel_id as Snowflake) as TextChannel;
    const channelMention = channel ? verboseChannelMention(channel) : `\`#${message.channel_id}\``;

    return `message embed in ${channelMention}:\n${messageSummary(message)}`;
  } else if (type === "username") {
    return `username: ${context.user!.username}`;
  } else if (type === "nickname") {
    return `nickname: ${context.member!.nickname}`;
  } else if (type === "visiblename") {
    const visibleName = context.member?.nickname || context.user!.username;
    return `visible name: ${visibleName}`;
  } else if (type === "customstatus") {
    return `custom status: ${context.member!.presence?.activities.find(a => a.type === "CUSTOM")?.name}`;
  }
}
