import { MatchableTextType } from "./matchMultipleTextTypesOnMessage";
import { AutomodContext, AutomodPluginType } from "../types";
import { messageSummary, verboseChannelMention } from "../../../utils";
import { GuildPluginData } from "knub";
import { User } from "eris";

export function getTextMatchPartialSummary(
  pluginData: GuildPluginData<AutomodPluginType>,
  type: MatchableTextType,
  context: AutomodContext,
) {
  if (type === "message") {
    const channel = pluginData.guild.channels.get(context.message.channel_id);
    const channelMention = channel ? verboseChannelMention(channel) : `\`#${context.message.channel_id}\``;

    return `message in ${channelMention}:\n${messageSummary(context.message)}`;
  } else if (type === "embed") {
    const channel = pluginData.guild.channels.get(context.message.channel_id);
    const channelMention = channel ? verboseChannelMention(channel) : `\`#${context.message.channel_id}\``;

    return `message embed in ${channelMention}:\n${messageSummary(context.message)}`;
  } else if (type === "username") {
    return `username: ${context.user.username}`;
  } else if (type === "nickname") {
    return `nickname: ${context.member.nick}`;
  } else if (type === "visiblename") {
    const visibleName = context.member?.nick || context.user.username;
    return `visible name: ${visibleName}`;
  } else if (type === "customstatus") {
    return `custom status: ${context.member.game.state}`;
  }
}
