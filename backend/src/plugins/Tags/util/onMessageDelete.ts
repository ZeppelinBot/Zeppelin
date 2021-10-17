import { Snowflake, TextChannel } from "discord.js";
import { GuildPluginData, typedGuildEventListener } from "knub";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { TagsPluginType } from "../types";
import { noop } from "../../../utils";

export const onMessageDelete = typedGuildEventListener({
  event: "messageDelete",
  async listener({ pluginData, args: { message: msg } }) {
    // Command message was deleted -> delete the response as well
    const commandMsgResponse = await pluginData.state.tags.findResponseByCommandMessageId(msg.id);
    if (commandMsgResponse) {
      const channel = pluginData.guild.channels.cache.get(msg.channelId) as TextChannel;
      if (!channel) return;

      await pluginData.state.tags.deleteResponseByCommandMessageId(msg.id);
      await channel.messages.delete(commandMsgResponse.response_message_id).catch(noop);
      return;
    }

    // Response was deleted -> delete the command message as well
    const responseMsgResponse = await pluginData.state.tags.findResponseByResponseMessageId(msg.id);
    if (responseMsgResponse) {
      const channel = pluginData.guild.channels.cache.get(msg.channelId) as TextChannel;
      if (!channel) return;

      await pluginData.state.tags.deleteResponseByResponseMessageId(msg.id);
      await channel.messages.delete(responseMsgResponse.command_message_id).catch(noop);
      return;
    }
  },
});
