import { Message } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { isDiscordAPIError } from "../../../utils.js";
import { reactionRolesCmd } from "../types.js";

export const ClearReactionRolesCmd = reactionRolesCmd({
  trigger: "reaction_roles clear",
  permission: "can_manage",

  signature: {
    message: ct.messageTarget(),
  },

  async run({ message: msg, args, pluginData }) {
    const existingReactionRoles = pluginData.state.reactionRoles.getForMessage(args.message.messageId);
    if (!existingReactionRoles) {
      void pluginData.state.common.sendErrorMessage(msg, "Message doesn't have reaction roles on it");
      return;
    }

    pluginData.state.reactionRoles.removeFromMessage(args.message.messageId);

    let targetMessage: Message;
    try {
      targetMessage = await args.message.channel.messages.fetch(args.message.messageId);
    } catch (err) {
      if (isDiscordAPIError(err) && err.code === 50001) {
        void pluginData.state.common.sendErrorMessage(msg, "Missing access to the specified message");
        return;
      }

      throw err;
    }

    await targetMessage.reactions.removeAll();

    void pluginData.state.common.sendSuccessMessage(msg, "Reaction roles cleared");
  },
});
