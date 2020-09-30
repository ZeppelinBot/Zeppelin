import { GuildPluginData } from "knub";
import { TagsPluginType } from "../types";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { TextChannel } from "eris";

export async function onMessageDelete(pluginData: GuildPluginData<TagsPluginType>, msg: SavedMessage) {
  // Command message was deleted -> delete the response as well
  const commandMsgResponse = await pluginData.state.tags.findResponseByCommandMessageId(msg.id);
  if (commandMsgResponse) {
    const channel = pluginData.guild.channels.get(msg.channel_id) as TextChannel;
    if (!channel) return;

    const responseMsg = await pluginData.state.savedMessages.find(commandMsgResponse.response_message_id);
    if (!responseMsg || responseMsg.deleted_at != null) return;

    await channel.deleteMessage(commandMsgResponse.response_message_id);
    return;
  }

  // Response was deleted -> delete the command message as well
  const responseMsgResponse = await pluginData.state.tags.findResponseByResponseMessageId(msg.id);
  if (responseMsgResponse) {
    const channel = pluginData.guild.channels.get(msg.channel_id) as TextChannel;
    if (!channel) return;

    const commandMsg = await pluginData.state.savedMessages.find(responseMsgResponse.command_message_id);
    if (!commandMsg || commandMsg.deleted_at != null) return;

    await channel.deleteMessage(responseMsgResponse.command_message_id);
    return;
  }
}
