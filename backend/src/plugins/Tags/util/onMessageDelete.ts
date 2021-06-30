import { Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { TagsPluginType } from "../types";

export async function onMessageDelete(pluginData: GuildPluginData<TagsPluginType>, msg: SavedMessage) {
  // Command message was deleted -> delete the response as well
  const commandMsgResponse = await pluginData.state.tags.findResponseByCommandMessageId(msg.id);
  if (commandMsgResponse) {
    const channel = pluginData.guild.channels.cache.get(msg.channel_id as Snowflake) as TextChannel;
    if (!channel) return;

    const responseMsg = await pluginData.state.savedMessages.find(commandMsgResponse.response_message_id);
    if (!responseMsg || responseMsg.deleted_at != null) return;

    await channel.messages.delete(commandMsgResponse.response_message_id as Snowflake);
    return;
  }

  // Response was deleted -> delete the command message as well
  const responseMsgResponse = await pluginData.state.tags.findResponseByResponseMessageId(msg.id);
  if (responseMsgResponse) {
    const channel = pluginData.guild.channels.cache.get(msg.channel_id as Snowflake) as TextChannel;
    if (!channel) return;

    const commandMsg = await pluginData.state.savedMessages.find(responseMsgResponse.command_message_id);
    if (!commandMsg || commandMsg.deleted_at != null) return;

    await channel.messages.delete(responseMsgResponse.command_message_id as Snowflake);
    return;
  }
}
