import { postCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { formatContent } from "../util/formatContent";
import { TextChannel } from "discord.js";

export const EditCmd = postCmd({
  trigger: "edit",
  permission: "can_post",

  signature: {
    message: ct.messageTarget(),
    content: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const savedMessage = await pluginData.state.savedMessages.find(args.message.messageId);
    if (!savedMessage) {
      sendErrorMessage(pluginData, msg.channel, "Unknown message");
      return;
    }

    if (savedMessage.user_id !== pluginData.client.user!.id) {
      sendErrorMessage(pluginData, msg.channel, "Message wasn't posted by me");
      return;
    }

    (pluginData.guild.channels.cache.get(savedMessage.channel_id) as TextChannel).messages.edit(savedMessage.id, {
      content: formatContent(args.content),
    });
    sendSuccessMessage(pluginData, msg.channel, "Message edited");
  },
});
