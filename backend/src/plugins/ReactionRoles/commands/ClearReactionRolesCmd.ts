import { Message } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { isDiscordAPIError } from "../../../utils";
import { reactionRolesCmd } from "../types";

export const ClearReactionRolesCmd = reactionRolesCmd({
  trigger: "reaction_roles clear",
  permission: "can_manage",

  signature: {
    message: ct.messageTarget(),
  },

  async run({ message: msg, args, pluginData }) {
    const existingReactionRoles = pluginData.state.reactionRoles.getForMessage(args.message.messageId);
    if (!existingReactionRoles) {
      sendErrorMessage(pluginData, msg.channel, "Message doesn't have reaction roles on it");
      return;
    }

    pluginData.state.reactionRoles.removeFromMessage(args.message.messageId);

    let targetMessage: Message;
    try {
      targetMessage = await args.message.channel.messages.fetch(args.message.messageId);
    } catch (err) {
      if (isDiscordAPIError(err) && err.code === 50001) {
        sendErrorMessage(pluginData, msg.channel, "Missing access to the specified message");
        return;
      }

      throw err;
    }

    await targetMessage.reactions.removeAll();

    sendSuccessMessage(pluginData, msg.channel, "Reaction roles cleared");
  },
});
