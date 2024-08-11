import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { postCmd } from "../types.js";
import { formatContent } from "../util/formatContent.js";

export const EditCmd = postCmd({
  trigger: "edit",
  permission: "can_post",

  signature: {
    message: ct.messageTarget(),
    content: ct.string({ catchAll: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const targetMessage = await args.message.channel.messages.fetch(args.message.messageId);
    if (!targetMessage) {
      void pluginData.state.common.sendErrorMessage(msg, "Unknown message");
      return;
    }

    if (targetMessage.author.id !== pluginData.client.user!.id) {
      void pluginData.state.common.sendErrorMessage(msg, "Message wasn't posted by me");
      return;
    }

    targetMessage.channel.messages.edit(targetMessage.id, {
      content: formatContent(args.content),
    });
    void pluginData.state.common.sendSuccessMessage(msg, "Message edited");
  },
});
